# AI Development History

Agent: **Claude Code** (Claude Sonnet 5.5) in the Claude desktop app, working in the project folder.
This is a Markdown summary of the session (not a raw export): prompts, what the agent did, and how
the work was steered, tested and debugged.

## 1. Initial request
> Using what's in the `web_survey_app` folder and the assignment instructions, go through the process of
> creating and deploying the web survey app. For the GitHub use
> `https://github.com/Antonio-CMA/cse_4095/tree/main/Classroom%20Web%20Survey%20App`

The assignment text (functional requirements, rubric, deliverables A–E) was pasted with the request.

## 2. Phase 1 — Review specifications
The agent read all five spec files, then checked the environment (Node 24, `gh` logged in, remote
repo contents). Findings it acted on:
- `TODO.md` had boxes pre-ticked before any work existed → must be re-audited at the end.
- The remote repo already contained an empty `Classroom Web Survey App/` folder, so the app belongs there.
- The local working tree had unrelated pending deletions in another assignment → publish from a
  **separate clone** so nothing unrelated is committed.
- GitHub Pages is already used by another assignment in the same repo (one Pages site per repo), so the
  spec's Cloudflare Pages is the right host.
- Decisions the specs left open were recorded (slug vs id routes, draft-only editing, all questions
  required) and later written into the README.

## 3. Phase 2 — Frontend + data layer
Agent scaffolded Vite + React + TS + Tailwind v4, React Router, supabase-js, Recharts, `qrcode`, ESLint,
Prettier, Vitest, then wrote: auth context + protected layout, landing/login, dashboard (search, status
and date filters, confirm dialogs), draft editor (reorder, validation, add/delete), present page (QR,
URL, live count, download PNG, fullscreen), results page (chart + accessible table), student page
(large touch targets, states), CSV export, error mapping, token-based duplicate protection, lazy-loaded
instructor routes (main bundle 777 kB → 476 kB).

## 4. Phase 3 — Database
Agent wrote `supabase/migrations/20261103000000_initial_schema.sql` from `DATABASE.md`: tables, indexes,
partial unique indexes, `updated_at` trigger, RLS policies, and RPCs (`save_survey`, `activate_survey`,
`close_survey`, `duplicate_survey`, `submit_survey_response`, `get_survey_results`,
`survey_public_status`).

## 5. Blockers that needed the human
The agent cannot (and is not allowed to) sign in to or create accounts. The user:
created the Supabase project, ran the SQL, created the instructor user, disabled public sign-ups, and
supplied the Project URL + publishable key (stored only in git-ignored `.env.local`). When the first
login failed, the agent explained that the app login is an Auth *user* in the project, not the Supabase
account password. The agent never entered the user's passwords; the user logged in themselves.

## 6. Testing and debugging (highlights)
| Step | Result |
| --- | --- |
| `npm run build` | **Failed:** Tailwind v4 `Cannot apply unknown utility class btn` → agent switched to `@utility` → passes |
| REST probe as anon | Tables exist, empty; direct insert into `responses` blocked by RLS ✔ |
| REST probe as anon | `get_survey_results` returned `AUTH_REQUIRED`, i.e. *callable* → agent diagnosed Supabase default `EXECUTE` grants to `anon` and wrote migration `…000001` (user ran it); re-test: `permission denied` ✔ |
| UI: create 2-question survey, save, reload | persisted ✔ |
| UI: Save & Activate | slug generated, QR page shows URL ✔ |
| Student flow from separate origin `http://[::1]:5173` | empty submit blocked; valid submit stored ✔ |
| Duplicate after clearing local flag | DB rejects → "Already submitted" ✔ |
| Anon RPC with missing / cross-question / fake IDs | `MISSING_REQUIRED_ANSWER`, `INVALID_CHOICE`, `INVALID_QUESTION` ✔ |
| 6 extra anon submissions | results: Q1 4/1/1/1, Q2 4/3 — matches hand count ✔ |
| CSV built in page (not downloaded) | metadata + header + 7 rows ✔ |
| Close survey | anon submit → `SURVEY_NOT_ACTIVE`; page shows closed message ✔ |
| Anon reads of all tables, PATCH survey, instructor RPCs | all empty/denied ✔ |
| Duplicate → activate copy | original auto-closed (one-active rule) ✔ |
| Delete | agent opened the wrong card's dialog first, read the title in a screenshot, cancelled, and deleted only the 0-response copy; strong warning for the 7-response survey displayed ✔ |

## 7. Publishing
Agent cloned the repo to a scratch directory, replaced `.placeholder`, copied the project (excluding
`node_modules`, `dist`, `.env.local`), verified no key or project ref appears in tracked files, committed
and pushed to `main`.

## 8. Deployment
The user created a Cloudflare account (GitHub sign-in) and approved the browser OAuth page opened by
`wrangler login`; the agent then confirmed the login with `wrangler whoami`, built with the user's
`.env.local`, and deployed. Problems: wrangler rejected `_redirects` as a redirect loop (file removed;
SPA fallback configured in `wrangler.jsonc` instead), and the first HTTPS requests failed until the TLS
certificate was provisioned (agent polled until HTTP 200, and checked `/`, `/login`, `/s/<slug>`,
`/dashboard`). The built-in browser pane could not open the new host (site approval), so production
checks were limited to HTTP status; the full production walk-through was left to the user.
Live URL: https://classroom-survey.classroom-survey.workers.dev

## 9. Still open at the time of writing
Production end-to-end test (login, activate, QR scan from a phone, submit, results), Supabase Table
Editor screenshots, and a grader account note in the HuskyCT submission.
