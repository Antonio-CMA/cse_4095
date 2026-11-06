# Part D — AI Development History

**Agent:** Claude Code (Claude Sonnet 5.5) in the Claude desktop app, working inside the project folder.
**Format:** a Markdown summary of the whole session, not a raw transcript. It records my prompts, what
the agent did, how the work was steered, and where things went wrong and were fixed.

## 1. My prompts (in order)

| # | What I said | Result |
| --- | --- | --- |
| 1 | Pasted the assignment text: "Using what's in the web_survey_app folder and the instructions here, go through the process of creating and deploying the web survey app. For the GitHub use …/Classroom Web Survey App" | Agent read the five specs, built the app, wrote the database migration, then stopped at the first thing it could not do without me (a Supabase project) |
| 2 | "Project ready" | The message had no URL or key, and the browser pane was still on the Supabase sign-in page, so the agent asked for them |
| 3 | "I'll sign in here" | The pane was still signed out; the agent waited for me |
| 4 | Gave the Supabase Project URL and publishable key | Agent saved them to git-ignored `.env.local`, probed the database, found the schema already applied, wrote a follow-up migration, and started the dev server |
| 5 | "I was able to do steps 2 and 3, but the log in failed. I'm using the password I set up for supabase." | Agent explained the app needs an *instructor user* created in Authentication → Users, not my Supabase account login |
| 6 | "Logged in" (twice, the first time in the wrong browser) | Agent checked: the pane had no session. After I logged in inside the pane, it ran the full test plan |
| 7 | "You can go ahead, I created an account with Cloudflare and signed in via GitHub … I've also created a second account under antonio.ayala@uconn.edu for grading" | Agent ran `wrangler login` (I approved the browser page), built, and deployed |
| 8 | "Can you confirm that the antonio.ayala@uconn.edu account is a grader account? And you can include the repo URL, live URL, and docs." | Agent said it could not confirm (no dashboard access; there is no separate grader role, any confirmed user is an instructor), and drafted the submission text |
| 9 | "The QR code was done, the screenshots are in, the email is fine, and the testing was done" | Agent reviewed every screenshot for secrets, renamed and indexed them, ticked the production items in TODO.md, and pushed |
| 10 | "Please create part c and d … make a markdown summary of what we did here. Afterwards, give me a list from a to e" | This file, the final Part C, and the submission checklist |

## 2. Phase 1 — Reading the specifications

The agent read all five Markdown files and checked the environment (Node, GitHub login, what the remote
repository already contained). Findings that shaped the work:

- `TODO.md` had boxes pre-ticked before any code existed, so it had to be audited at the end.
- The remote repo already had an empty `Classroom Web Survey App/` folder, so the app belongs there.
- My local working tree had unrelated pending deletions from another assignment, so the agent published
  from a **separate clone** rather than touching my tree.
- One GitHub Pages site per repo was already in use by another assignment, so Cloudflare (the spec's
  choice) was the right host.
- Gaps in the specs were recorded as decisions in the README.

## 3. Phase 2 — Building the app

Vite + React + TypeScript + Tailwind v4, React Router, supabase-js, Recharts, `qrcode`, ESLint, Prettier
and Vitest were set up. The agent wrote the auth context and protected routes; the landing and login
pages; the dashboard (search, status and date filters, confirmation dialogs); the draft editor (reorder,
validation); the QR "present" page (live response count, PNG download, full screen); the results page
(chart plus accessible table); the student page; CSV export; error-message mapping; and token-based
duplicate protection. Instructor routes were lazy-loaded, cutting the main bundle from 777 kB to 476 kB.
It wrote `20261103000000_initial_schema.sql` from `DATABASE.md`: tables, indexes, trigger, RLS, and the
RPC functions.

## 4. Work only I could do

The agent cannot sign in to or create accounts. I created the Supabase project, ran the SQL, created the
instructor user, turned off public sign-ups, and later created the Cloudflare account and the grader
user. I logged in to the app myself, so my password never passed through the agent. I approved the
Cloudflare authorization page, ran the phone test, and took the database and phone screenshots.

## 5. Testing and debugging

| Step | Result |
| --- | --- |
| `npm run build` | **Failed:** Tailwind v4 `Cannot apply unknown utility class btn`. Agent switched to `@utility`; passes |
| Early shell commands | A long heredoc failed on quoting; the agent switched to writing files directly |
| Anonymous REST probe | Tables empty; direct insert into `responses` blocked by RLS |
| Anonymous call to `get_survey_results` | Returned `AUTH_REQUIRED`, meaning it was *callable*. Agent diagnosed Supabase's default `EXECUTE` grant to `anon` and wrote a second migration, which I ran. Re-test: `permission denied` |
| Create a two-question survey, save, reload | Persisted |
| Save and activate | Slug generated; QR page shows the URL |
| Student flow from a second origin (`http://[::1]:5173`) | Empty submit blocked; valid submit stored. (The pane refused `127.0.0.1`, so the agent tried another separate origin.) |
| Repeat submit after clearing the local "submitted" flag | Database rejects it; page shows "Already submitted" |
| Missing / cross-question / fake IDs via RPC | `MISSING_REQUIRED_ANSWER`, `INVALID_CHOICE`, `INVALID_QUESTION` |
| Six extra anonymous submissions | Results (Q1 4/1/1/1, Q2 4/3) matched a hand count |
| CSV built in the page (not downloaded) | Metadata, header and 7 rows correct |
| Close survey | Submissions fail with `SURVEY_NOT_ACTIVE`; student sees the closed message |
| Anonymous reads of all tables, PATCH of a survey, instructor functions | All empty or denied |
| Duplicate, then activate the copy | Original auto-closed (one-active rule) |
| Delete | The agent opened the wrong card's dialog first (the survey with 7 responses), read its title in a screenshot, cancelled, and deleted only the 0-response copy. The strong data-loss warning displayed correctly |

An early "Logged in" from me turned out to be a login in a different browser; the agent verified the pane
had no session instead of assuming.

## 6. Publishing and deployment

- **GitHub:** cloned the repo to a scratch folder, replaced `.placeholder`, copied the project (excluding
  `node_modules`, `dist`, `.env.local`), scanned for the key and project ref in tracked files (none),
  and pushed to `main`.
- **Cloudflare:** `wrangler login` (I approved), then a build with my `.env.local` and a deploy.
  Problems: wrangler rejected `_redirects` as a redirect loop (file removed, SPA fallback set in
  `wrangler.jsonc`); the first HTTPS requests failed until the certificate was provisioned (agent polled
  until HTTP 200); and wrangler's setup silently added a Cloudflare Vite plugin and dependency and edited
  `vite.config.ts`. The agent reverted those, cleared a stale `.wrangler` redirect (after stopping the dev
  server that was locking files), rebuilt, re-ran lint and tests, and redeployed.
- **Verification of the live site:** `/`, `/login`, `/dashboard` and `/s/<slug>` return the app; the bundle
  contains the Supabase URL and publishable key and no `service_role` key.

## 7. Production check and evidence

I logged in on the deployed site, activated the survey, scanned the QR code with my phone, submitted, and
viewed the results. My phone submission appears in the `responses` table. The agent opened each screenshot
before publishing it, found no credentials or private data, renamed the files, and added an index
(`docs/screenshots/README.md`). TODO.md ticks only the production items I confirmed.

## 8. What the agent was asked not to guess

When I asked whether `antonio.ayala@uconn.edu` was a grader account, the agent said it could not verify
that and told me how to check, rather than assuming the account existed.

## 9. Still open

Opening the exported CSV in Excel/Sheets, a screen-reader and full keyboard accessibility pass, and my own
confirmation that the grader login works on the live site.
