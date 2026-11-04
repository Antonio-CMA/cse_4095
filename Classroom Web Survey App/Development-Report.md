# Development Summary — Classroom Survey Web App

**Course:** CSE 4095  **Author:** Antonio-CMA
**Repository:** https://github.com/Antonio-CMA/cse_4095/tree/main/Classroom%20Web%20Survey%20App
**Deployed app:** https://classroom-survey.classroom-survey.workers.dev
**Stack:** React + TypeScript + Vite + Tailwind, Supabase (PostgreSQL, Auth, RLS, RPC), Recharts, `qrcode`, Cloudflare

## 1. How the specification documents guided the AI agent

I gave the agent (Claude Code) all five Markdown files and had it read them before writing code. The
documents were used as a contract:

- `DATABASE.md` became the SQL migration almost line for line (tables, indexes, partial unique indexes
  for "one active survey" and "one response per browser token", RLS policies).
- `API.md` decided the data-access layer: direct `supabase-js` queries for simple instructor reads, and
  RPC functions (`activate_survey`, `close_survey`, `submit_survey_response`, …) wherever atomicity or
  validation mattered. Its error codes (`SURVEY_NOT_ACTIVE`, `DUPLICATE_RESPONSE`, …) are mapped to
  friendly messages in `src/lib/errors.ts`.
- `UI.md` gave the routes, page layouts, confirmation dialogs, empty states and the 44 px touch-target rule.
- `TODO.md` was the checklist. It arrived with many boxes already ticked, so I re-audited it and only
  ticked what was implemented **and** tested; the remaining unticked items are listed honestly.

Where the specs disagreed or were silent I documented the decision in the README (e.g. `/s/:slug` vs
`/s/:surveyId`; only drafts are editable so recorded answers can never point at changed questions).

## 2. What the AI agent generated

Essentially all of the code: the Vite/React project and config, every page and component, the API layer,
CSV export with formula-injection protection, unit tests, the SQL migrations, the README and this
report's first draft. My role was to read and review the generated code, create and configure the
Supabase project and instructor accounts (which required my own accounts and passwords), run the SQL,
perform the browser testing with the agent, and make the design decisions listed above.

## 3. Database configuration

The migration in `supabase/migrations/` creates five tables — `surveys`, `questions`, `choices`,
`responses`, `answers` — with primary keys (UUID) and foreign keys with `ON DELETE CASCADE`
(survey → questions → choices; survey → responses → answers; answers also reference question/choice).
Constraints: status and question-type `CHECK`s, `UNIQUE(response_id, question_id)`, a partial unique
index allowing only one `active` survey, and a partial unique index on `(survey_id, anonymous_token)`.

**Security.** RLS is enabled on every table. Students (`anon`) can only `SELECT` active surveys and
their questions/choices; they have no policy on `responses`/`answers`, so they cannot read results or
insert directly. Submissions go through `submit_survey_response()` (SECURITY DEFINER) which verifies
the survey is active, each question belongs to it, each choice belongs to its question, every
question is answered, and the token is new. The instructor is a Supabase Auth user with full access;
public sign-ups are disabled. Only the publishable (anon) key ships to the browser.

## 4. How the frontend talks to the database

`src/lib/supabase.ts` creates one client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
`src/lib/api.ts` is the only module that calls it. The instructor pages use the signed-in JWT; the
student page `/s/:slug` uses the anon role: it loads the active survey with one nested `select`
(`questions(choices(...))`), and submits with a single RPC call. Results are aggregated inside the
database by `get_survey_results()` and rendered with Recharts plus an accessible table of counts and
percentages. CSV is built in the browser.

## 5. Problems encountered and how they were resolved

1. **Tailwind v4 build error** — `Cannot apply unknown utility class btn`. v4 cannot `@apply` classes
   defined in `@layer components`; I had the agent redefine them with `@utility`.
2. **Anonymous users could still call instructor functions.** `REVOKE … FROM PUBLIC` is not enough on
   Supabase because it grants `EXECUTE` to `anon` through default privileges. My REST probe showed the
   function was reachable (it failed only on the internal `AUTH_REQUIRED` check). A follow-up migration
   revokes `anon` explicitly; afterwards the same call returns `permission denied`.
3. **Testing the student flow as a real student.** The instructor session in `localStorage` made the
   student page run as `authenticated`, hiding RLS problems. I tested the student flow from a second
   origin (`http://[::1]:5173`, separate storage) and also through raw REST calls with only the anon key.
4. **Login confusion** — the app login needs an instructor user created under *Authentication → Users*,
   not the Supabase dashboard account.

## 6. Verification performed (against the live Supabase project)

Create/edit/save draft; add multiple-choice and true/false questions; activate (slug generated); student
validation (blocks empty submit); student submission stored; duplicate submission rejected even after
clearing the local "submitted" flag; invalid payloads (missing answer, choice from another question,
fake question) rejected by the database; closing makes submissions fail and shows the closed message;
only one active survey (activating a second closes the first); duplicate and delete with stronger
warning when responses exist; results counts/percentages and CSV content match the submitted data;
anonymous reads of `responses`, `answers`, direct inserts and instructor RPCs are all denied.
Not yet done: scanning the QR code with a physical phone, opening the CSV in Excel, a screen-reader pass.

## 7. Deployment

The static React build is hosted on Cloudflare; the database stays on Supabase, so the public site does
not depend on my local network. Steps: `npx wrangler login` (browser OAuth to my Cloudflare account),
then `npm run deploy` (= `npm run build && npx wrangler deploy`). The two public `VITE_SUPABASE_*`
values are read from the git-ignored `.env.local` at build time; no secret or service-role key is
involved. `wrangler.jsonc` uses `not_found_handling: single-page-application`, so QR deep links such as
`/s/<slug>` load the app (confirmed: `/`, `/login`, `/s/…`, `/dashboard` all return the app over HTTPS).
Two deployment problems: wrangler rejected the usual `_redirects` rule (`/* /index.html 200`) as a
redirect loop, so I deleted the file and relied on the SPA fallback setting; and the first HTTPS request
to the new hostname failed its TLS handshake until the certificate finished provisioning (about a minute).
The GitHub repository is not connected to Cloudflare, so redeploys are manual (`npm run deploy`);
the README documents the Git-connected alternative. Production end-to-end testing is listed above as
not yet done.

## 8. What I learned

The database is the real application boundary: with a login-free student interface, correctness and
security had to live in RLS and in a validated database function, not in React. Defaults matter (the
`anon` function grant). Testing as the *least privileged* actor caught what testing as the instructor
could not. And AI-generated code that compiles is not evidence of correctness — the useful work was
writing down expectations (the specs), then checking every one against the running system.
