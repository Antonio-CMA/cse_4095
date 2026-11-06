# Part C — Development Summary: Classroom Survey Web App

**Course:** CSE 4095  **Author:** Antonio-CMA
**Repository:** https://github.com/Antonio-CMA/cse_4095/tree/main/Classroom%20Web%20Survey%20App
**Deployed app:** https://classroom-survey.classroom-survey.workers.dev
**Stack:** React + TypeScript + Vite + Tailwind CSS · Supabase (PostgreSQL, Auth, Row Level Security, RPC) · Recharts · `qrcode` · Cloudflare

## 1. How the specification documents guided the AI agent

I gave the agent (Claude Code) all five Markdown files and had it read them before it wrote anything.
It then treated them as a contract:

- **DATABASE.md** became the SQL migration almost line for line: tables, indexes, the partial unique
  index for "one active survey", the unique `(survey_id, anonymous_token)` index, and the RLS policies.
- **API.md** set the data-access design: direct `supabase-js` queries for simple instructor reads, and
  database functions (`save_survey`, `activate_survey`, `close_survey`, `submit_survey_response`,
  `get_survey_results`) wherever atomicity or validation mattered. Its error codes
  (`SURVEY_NOT_ACTIVE`, `DUPLICATE_RESPONSE`, …) are mapped to friendly messages in `src/lib/errors.ts`.
- **UI.md** supplied the routes, page layouts, confirmation dialogs, empty states and 44 px touch targets.
- **TODO.md** was the checklist. It arrived with many boxes already ticked, so the agent re-audited it
  and I ticked only what was implemented **and** tested.

Where the specs conflicted or were silent, the decision is recorded in the README (for example the
public route is `/s/:slug`, as in UI.md, rather than `/s/:surveyId`; and only drafts are editable so
recorded answers can never point at changed questions).

## 2. What the AI agent generated

Essentially all of the code: the project setup, every page and component, the API layer, CSV export
(with spreadsheet formula-injection protection), the unit tests, both SQL migrations, the README, and a
first draft of this report. My part was to review the work, create and configure the Supabase and
Cloudflare accounts and the instructor and grader users (which need my own logins), run the SQL, supply
the public Supabase URL and key, log in myself during testing, test on my phone, take the database
screenshots, and decide design questions.

## 3. Database configuration

The migration (`supabase/migrations/`) creates `surveys`, `questions`, `choices`, `responses` and
`answers`, each with a UUID primary key. Foreign keys use `ON DELETE CASCADE`: survey → questions →
choices, and survey → responses → answers (answers also reference a question and a choice). Constraints
include `CHECK`s on status and question type, `UNIQUE(response_id, question_id)`, and the two partial
unique indexes above. RLS is enabled on every table:

- **Students (`anon`)** may only `SELECT` active surveys and their questions/choices. They have no
  policy at all on `responses` or `answers`, so they cannot read results or insert directly.
- **Submissions** go through `submit_survey_response()`, which checks that the survey is active, each
  question belongs to it, each choice belongs to its question, every question is answered, and the
  browser token has not been used.
- **The instructor** is a Supabase Auth user with full access; public sign-ups are disabled.
  Only the publishable (anon) key is ever shipped to the browser.

## 4. How the frontend communicates with the database

`src/lib/supabase.ts` builds one client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and
`src/lib/api.ts` is the only module that calls it. Instructor pages run with the signed-in user's JWT.
The student page loads the active survey with one nested query (`questions(choices(...))`) as the
`anon` role and submits with a single RPC call. Results are aggregated inside the database and drawn
with Recharts plus a table of counts and percentages; the CSV is built in the browser.

## 5. Problems encountered and how I resolved them

1. **Anonymous users could still call instructor functions.** `REVOKE … FROM PUBLIC` does not remove
   the `EXECUTE` grant Supabase gives `anon` by default. A REST probe showed `get_survey_results` was
   callable (it only failed the function's own `AUTH_REQUIRED` check). A second migration revokes `anon`
   explicitly; the same call now returns `permission denied`.
2. **Testing as a student hid RLS problems.** My instructor session in `localStorage` made the student
   page run as `authenticated`. The agent tested the student flow from a second origin with separate
   storage and with raw REST calls using only the anon key.
3. **Tailwind v4 build error** (`Cannot apply unknown utility class btn`), fixed by redefining the
   shared classes with `@utility`.
4. **Deployment tooling changed my project.** Wrangler's setup added a Cloudflare Vite plugin and edited
   `vite.config.ts`; the agent reverted it and redeployed from a plain build. Cloudflare also rejected the
   usual `_redirects` SPA rule as a redirect loop, so QR deep links are handled by
   `not_found_handling: single-page-application` in `wrangler.jsonc`.
5. **Login confusion.** The app's login is an Auth user created under *Authentication → Users*, not my
   Supabase dashboard account.

## 6. Verification

Against the live Supabase project: creating, saving, reloading and activating a draft; student
validation; stored submissions; duplicate submissions rejected by the database even after clearing the
local flag; invalid payloads (missing answer, choice from another question, fake question) rejected;
closing a survey makes submissions fail; only one survey can be active; results and CSV content match
the submitted data; anonymous reads and writes of protected tables and instructor functions are denied.
On the deployed site I logged in as the instructor, activated the survey, scanned its QR code with my
phone, submitted, and viewed the results. Evidence is in `docs/screenshots/`. Not done: opening the CSV
in Excel/Sheets and a screen-reader accessibility pass.

## 7. Deployment

The static build is hosted on Cloudflare and the database stays on Supabase, so the public site does
not depend on my network. I authorized `npx wrangler login` in my browser, then `npm run deploy`
(`npm run build && npx wrangler deploy`) built with the two public `VITE_SUPABASE_*` values from the
git-ignored `.env.local` and published `dist/`. The repository is not connected to Cloudflare, so
redeploys are manual; the README documents the Git-connected alternative. For grading, a separate
instructor user exists in Supabase; its credentials are given only in the HuskyCT submission, never in
the repository.

## 8. What I learned

The database is the real boundary of this application: with a login-free student page, correctness and
security have to live in RLS and validated database functions, not in React. Defaults matter (the
`anon` function grant). Testing as the least-privileged user found what testing as the instructor could
not. And code that compiles is not evidence it works: the useful loop was writing down expectations (the
specs), then checking each one against the running system.
