# Classroom Survey Web App

Quick in-class understanding checks. The instructor builds a survey, activates it, and projects a
QR code; students scan it, answer on their phones without logging in, and the instructor watches the
results come in.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS, React Router, Recharts, `qrcode`
- **Backend / database:** Supabase (PostgreSQL, Auth, Row Level Security, RPC functions)
- **Hosting:** Cloudflare Pages (static site) — database stays on Supabase

Specifications that drove the build: [`Classroom_Survey_Web_App_Specification.md`](Classroom_Survey_Web_App_Specification.md),
[`DATABASE.md`](DATABASE.md), [`API.md`](API.md), [`UI.md`](UI.md), [`TODO.md`](TODO.md).
Design decisions that the specs left open are listed at the bottom of this file.

## Architecture

```
Browser (React SPA)  ──supabase-js──►  Supabase
  /s/:slug  student (anon key)            ├─ PostgREST  (tables, guarded by RLS)
  /dashboard … instructor (JWT)           ├─ RPC functions (activate, save, submit, results…)
                                          ├─ Auth       (instructor email + password)
                                          └─ PostgreSQL (surveys, questions, choices, responses, answers)
```

There is no custom server. Anything that needs atomicity or elevated rights is a Postgres function
in [`supabase/migrations/`](supabase/migrations):

| RPC | Caller | Purpose |
| --- | --- | --- |
| `save_survey` | instructor | create/replace a **draft** with all questions + choices in one transaction |
| `activate_survey` | instructor | closes the currently active survey, creates the public slug, activates |
| `close_survey` | instructor | active → closed (submissions fail immediately) |
| `duplicate_survey` | instructor | copy as a draft (never copies responses) |
| `get_survey_results` | instructor | counts + percentages per choice |
| `submit_survey_response` | student (anon) | validates and stores a submission atomically |
| `survey_public_status` | student (anon) | lets the page say “closed” vs “not found” without leaking content |

### Security model (Row Level Security)

- Every table has RLS enabled.
- `anon` (students) can only `SELECT` **active** surveys and their questions/choices. They have **no
  policy at all** on `responses` / `answers`: they cannot read results and cannot insert directly.
  The only way in is `submit_survey_response`, which checks the survey is active, every question
  belongs to it, every choice belongs to its question, all questions are answered, and the browser
  token has not been used before.
- `authenticated` (instructor) has full access.
- Duplicate protection: a random per-browser token (localStorage) is stored with each response and a
  partial unique index `(survey_id, anonymous_token)` makes the database reject repeats.
- “Only one active survey” is enforced by the partial unique index `only_one_active_survey`.
- Only the public **anon** key is used in the browser. The `service_role` key is never used or stored.

## Local setup

Prerequisites: Node 20+ and a free Supabase account.

1. **Install**
   ```bash
   npm install
   ```
2. **Create a Supabase project** (dashboard → New project).
3. **Create the schema:** Supabase dashboard → *SQL Editor* → New query → paste the whole contents of
   [`supabase/migrations/20261103000000_initial_schema.sql`](supabase/migrations/20261103000000_initial_schema.sql) → Run.
4. **Create the instructor account:** *Authentication → Users → Add user → Create new user*
   (tick *Auto Confirm User*). Then **disable public sign-ups**: *Authentication → Sign In / Providers →
   Email → turn off “Allow new users to sign up”*. (Policies grant instructor rights to any
   authenticated user, so nobody else must be able to register.)
5. **Configure env vars:** copy `.env.example` to `.env.local` and fill in *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon / publishable key>
   ```
6. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173, log in as the instructor.

Useful scripts: `npm run build`, `npm run lint`, `npm test`, `npm run format`.

To test the student flow on a phone during development, run `npm run dev -- --host` and open the
LAN address, or just use the deployed site.

## Deployment (Cloudflare Pages)

1. Push this repo to GitHub.
2. Cloudflare dashboard → *Workers & Pages → Create → Pages → Connect to Git* → pick the repo.
3. Build settings:
   - **Root directory:** `Classroom Web Survey App` (the folder containing `package.json`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable (Production):** `NODE_VERSION=22`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy. [`public/_redirects`](public/_redirects) makes every path fall back to `index.html`, so
   deep links such as `/s/ab12cd34` (the QR-code URLs) work.
5. QR codes use `window.location.origin`, so they automatically point at the production URL when the
   instructor presents from the deployed site (override with `VITE_PUBLIC_BASE_URL` if needed).

## Giving the grader instructor access (without committing credentials)

Do **not** put credentials in the repo. Create a separate grader user in Supabase (*Authentication →
Users*) and submit its email/password only in the HuskyCT submission text.

## Design decisions not covered by the specs

- **Edit only drafts.** Active/closed/archived surveys are immutable so recorded answers can never
  point at changed questions. Use *Duplicate* to get an editable copy. (TODO.md says “prevent editing
  an active survey unless first closed”; this is stricter for data integrity.)
- **Public route is `/s/:slug`** (UI.md/API.md) rather than `/s/:surveyId` (TODO.md). Slugs are 8 hex
  characters from `gen_random_uuid()`, generated on first activation and kept on re-activation so an
  old QR code keeps working.
- **All questions are required** on the student form (`MISSING_REQUIRED_ANSWER`).
- **True/False questions** always get exactly the choices “True” and “False”, created by the database.
- **Re-activating a closed survey** is allowed (it keeps its slug and existing responses; students who
  already answered are still blocked by their token).
- **Archived surveys** keep their results but cannot be activated or edited.
- **CSV export** is generated in the browser: a short metadata block (title, status, created, total
  responses), a blank line, then one row per response with a column per question. Fields beginning with
  `= + - @` are prefixed with `'` to prevent spreadsheet formula injection.
- **Duplicate protection is best-effort**: a student who clears site data or uses another browser can
  submit again. That is inherent to anonymous, login-free surveys.
