# Development Report: Math Practice App

**Course:** CSE 4095, Agentic Learning, Assignment 13
**Repository:** https://github.com/Antonio-CMA/cse_4095 (the app is in `Assignment 13/math-practice-app`)
**Live site:** see [section 11](#11-deployment)
**Built:** 20–21 October 2026

## 1. Summary

I built a browser-based math practice app for children aged 7–12. A child picks the
operations (addition, subtraction, multiplication, division, or a mix), a level and a
session length, then answers multiple-choice questions on flip cards: choose an answer,
flip the card to see the solution, and say whether it was right. The app remembers the
questions that were missed, builds similar questions from them, and shows statistics for
the child, a parent or a teacher. There are no accounts and nothing leaves the device:
all progress is kept in the browser.

The work was done with AI assistance in three stages (section 4): a specification and
22-phase plan written with ChatGPT, an earlier session in Cursor, and the
implementation, testing and release preparation done with Claude Code, one phase at a
time. The final application has about 7,300 lines of application code, 16,900 lines of
tests (1,412 automated tests in 115 files, about 99% statement and branch coverage), and
passes lint, formatting, type-checking, the tests and a production build with one
command (`npm run verify`).

## 2. Requirements and where they are met

The specification (`Project Docs/ChatGPT-Full-Transcript.md`, sections 1–21) was turned
into 22 phases and 89 tasks. Every functional requirement is implemented, with one
exception noted below.

| Spec section | Requirement | Status | Where |
|---|---|---|---|
| 5, 16 | Home, setup, practice, summary, statistics and settings pages with React Router | Done | `src/pages`, `src/app/AppRoutes.tsx` |
| 6.1 | Home page: title, welcome message, Start Practice, View Statistics, Settings | Done | `HomePage.tsx` |
| 6.2 | Setup: one or more operations or mixed; four levels; 5/10/20/continuous; regular or mistake review; Start disabled until valid | Done | `PracticeSetupPage.tsx`, selector components |
| 6.3 | Question cards: question, four choices, question number and total, progress bar; highlight the choice; Flip Card enabled after choosing; back shows question, correct answer, your answer, explanation, right/wrong buttons; each question counted once; next question automatic | Done | `QuestionCard.tsx`, `CardFront/CardBack.tsx`, `usePracticeSession.ts` |
| 6.4 | Remember wrong questions; similar questions (nearby numbers, reversed operands, inverse operation, fact family, same level); review priority; mastery after 3 (configurable) | Done | `similarQuestionGenerator.ts`, `mistakeReview.ts`, `mistakeService.ts` |
| 6.5 | Session summary with totals, accuracy, operations, level, review count; Practice Again, Practice Mistakes, Change Settings, View Statistics, Return Home; End Session for continuous practice | Done | `SessionSummaryPage.tsx`, `SummaryActions.tsx` |
| 6.6 | Statistics: overall, by operation, by level, mistake statistics, recent sessions, Reset with confirmation | Done | `StatisticsPage.tsx`, `components/statistics` |
| 6.7 | Settings: sound, card animation, explanations, default length/level/operations, mastery count, clear all data | Done, except sound (below) | `SettingsPage.tsx` |
| 4.2, 4.3, 11 | React Context and hooks; `localStorage` with the suggested keys and a schema version; no backend | Done | `AppProvider.tsx`, `storageService.ts`, `storageMigrations.ts` |
| 7–9, 18 | Four difficulty levels with number ranges; exactly four unique choices including the answer; whole-number division, no division by zero; validation before showing and recording | Done | `difficultyRules.ts`, `operationGenerators.ts`, `validation.ts` |
| 13 | Bright, child-friendly design; large buttons with hover/focus/pressed states; centred card; flip animation; kind feedback | Done | `index.css`, `utils/feedback.ts` |
| 14 | Keyboard use (keys 1–4), visible focus, semantic HTML, contrast, screen-reader text, reduced motion, nothing by colour alone, live announcement of the revealed answer | Done | `useAnswerShortcuts.ts`, `utils/speech.ts`, `designContrast.test.ts` |
| 15 | Desktop, laptop, tablet and phone; single-column answers; menu that collapses; stacked cards | Done | `Header.tsx`, `index.css` |
| 16 | Warn before leaving an active session | Done | `PracticePage.tsx` (`useBlocker`) |
| 17 | Invalid stored data, missing session, generation failures, unsupported or full storage, corrupted statistics, unexpected navigation | Done | `dataRepair.ts`, `fallbackQuestions.ts`, `ErrorBoundary.tsx`, `StorageWarning.tsx` |

**Not implemented: sound effects.** The setting exists, is saved, and is explained on the
Settings page ("Sounds aren't added yet…"), but the app plays no sounds. The specification
lists sound only as a suggested setting and lists audio under future work.

Beyond the specification, the plan added: session recovery after a page refresh, error
screens, performance work for large histories, a Privacy page, and release preparation.

## 3. Technology

React 19 and TypeScript 6, built with Vite 8; React Router 8 (a data router, needed to
block accidental navigation); Vitest 5 with jsdom, React Testing Library and user-event;
axe-core for accessibility checks; ESLint and Prettier. The only runtime libraries are
`react`, `react-dom` and `react-router`. State is held with React Context, `useReducer`
and hooks. Data lives in `localStorage` behind one wrapper that never throws.

The code is layered so that rules can be tested without a browser: pure services and
utilities (question generation, statistics, mistake tracking, storage), hooks that
connect them to React, and components and pages that only display and collect input.

## 4. How the work was done, and how AI was used

**Stage 1: specification (ChatGPT).** I asked ChatGPT for a software specification for
the app. It asked clarifying questions first, then wrote a 21-section specification and a
plan of 22 phases and 89 checkbox tasks. The full conversation is in
`Project Docs/ChatGPT-Full-Transcript.md`.

**Stage 2: a Cursor session.** I also kept the transcript of a Cursor session about this
project (titled "Cursor Math Practice Full Transcript", 246 pages):
`Project Docs/cursor_math_practice_full_transcript.pdf`. The application in this
repository was built in stage 3 below.

**Stage 3: implementation (Claude Code).** Claude Code did the building, in this working
agreement that I set:

- one branch per phase (`phase-N-topic`), small commits, and a report to me after each phase;
- a phase is merged into `main` with a merge commit that says what changed, and pushed,
  only when I say to move on;
- every phase ends with lint, type-checking, tests and, for anything visible, a check in
  a real browser;
- I review and redirect between phases (for example, asking for explanations of the new
  tests and of design decisions).

The whole conversation is exported in
`AI-Conversation-Evidence/Claude-Code-Session-Transcript.md`: my messages, Claude's
replies and a count of the tool actions between them.

**What I decided and what the AI did.** I chose the product, the phase-by-phase
workflow, when to merge, and the final goals (deployment, report, evidence). The AI wrote
the code and tests, ran them, investigated failures and reported results. I did not
write the code by hand.

**How the AI's work was checked.** Not by trusting its statements:

- the test suite, type-checker, linter and build run after every change;
- tests were written to catch real faults, and several times a fault was put back on
  purpose to confirm the test failed (a `fetch` call and a cookie for the privacy test,
  the keyboard-focus fix, the old per-answer storage reads);
- visible behaviour was checked in a real browser, not only in jsdom, which has no layout
  and does not run CSS;
- measurements were taken before and after performance changes.

**Limits of AI assistance seen in this project.** The AI could not use other browsers,
a real screen reader, real phones, or my GitHub account, and said so rather than
claiming those were tested. Early test runs sometimes failed because of mistakes in the
tests themselves (for example a wrong difficulty label or an observer that missed
attribute changes), which were then corrected. These are listed honestly in the sections
below.

## 5. What was built, phase by phase

Each phase was one branch and one merge into `main` (22 merges in the history).

| Phase | Result |
|---|---|
| 1–2 | Project setup (Vite, React, TypeScript, tooling); layout, navigation, pages |
| 3–5 | Practice configuration; question generation with difficulty rules; multiple-choice answers and distractors |
| 6–8 | The flip card; running a session; session summary |
| 9–11 | Local storage with versioning; statistics; settings |
| 12–15 | Mistake tracking; similar questions; mistake review and mastery; advanced statistics |
| 16 | Accessibility: keyboard, screen readers, reduced motion, contrast, reflow |
| 17 | Responsive design, mobile menu, encouraging messages |
| 18 | Session recovery after refresh; leave-session confirmation |
| 19 | Error handling: damaged data repaired per category, fallback questions, friendly error screens |
| 20 | Testing: coverage, integration flows, axe checks, keyboard-only run |
| 21 | Performance and data management |
| 22 | Privacy page, security headers, release checks |

## 6. Testing

- **1,412 automated tests in 115 files**, all passing. About 99% of statements and
  branches are covered; what remains is code that cannot be reached (a server-rendering
  fallback, a floating-point guard).
- **Unit tests** for the generators and their difficulty limits, distractors, answer
  uniqueness, statistics, mistake updates, similar questions, mastery and storage.
- **Component and page tests** for every selector, the card (choosing, flipping, verdicts),
  progress, session completion, statistics and confirmation dialogs.
- **Integration tests** that drive the real routes like a student: a full addition
  session, a mixed-operation session, continuous practice, a wrong answer creating a
  mistake pattern, mistake review through to mastery, persistence after a refresh and
  resetting statistics.
- **Accessibility:** axe-core over every page and state (jsdom, and a real browser for
  colour contrast), a keyboard-only run of a whole visit, reduced-motion tests, and zoom
  checks at 320 px and at 200% text.
- **Guards that read the real files:** colour contrast ratios, 44 px tap targets, no
  fixed widths that break reflow, and the privacy promises.
- **Browsers:** checked on the production build in Chromium at 320, 375, 414, 768 and
  1024 px. **Not checked: Safari, Firefox, Edge, real phones or tablets, a real screen
  reader.** These are listed as manual checks in `math-practice-app/RELEASE.md`.

## 7. Problems found and fixed

Testing and measuring found real faults that no one had asked about:

| Found by | Problem | Fix |
|---|---|---|
| A unit test | Default settings shared one array, so changing a copy changed the defaults | Settings are copied |
| Writing the keyboard-only test | After a verdict focus fell to the top of the page, so each question cost a trip through the header for keyboard users | The new question card takes focus |
| Zoom check | At 320 px with 200% text, the practice card scrolled sideways and a heading broke mid-word | Sizes written in `rem` are capped by screen width, and a test guards it |
| Benchmark | Saving one answer took 44 ms with a full history (three reads of the whole list) | One read, a smaller detail list and archived totals: 3 ms |
| Reading the code | Rebuilding damaged totals undercounted once old attempts had been trimmed | Trimmed attempts are archived into totals first |
| Render count | Every tap redrew the practice page twice | Card progress kept in a ref: once |
| Benchmark | Statistics took 717 ms to open with 1,000 mistakes | Paged list and memoised sections: 118 ms (45 ms in production) |
| Test while building | Blocking navigation needs a data router; the app and many tests used the older router | The app and the tests were moved to a data router |
| Release check | The favicon was still the default Vite logo (9.5 kB) | A 204-byte icon |
| Release check | An inline link on the Privacy page was 24 px tall | A proper 44 px button |

## 8. Performance

Measured in a desktop browser with a full-size history (200 sessions, 1,000 mistakes,
thousands of answers). Phones are typically 4–6 times slower; a slow-device test was not
possible, so those multiples are estimates.

| | Before | After |
|---|---|---|
| Saving one answer | 44 ms | 3 ms |
| Opening Statistics (1,000 mistakes, development build) | 717 ms | 118 ms |
| Opening Statistics (production build) | not measured | 45 ms |
| Saved data for that history | 2.05 million characters | 0.40 million |
| Main script (gzipped) | 120 kB | 118 kB |

In the production build, choosing an answer takes about 3 ms, flipping 3 ms, and a verdict
(save, totals, mistakes, next question) 15 ms. First contentful paint is about 120 ms
locally.

## 9. Accessibility

Keys 1–4 choose answers; every control works by keyboard with a visible focus ring; the
question is announced in words for screen readers ("7 times 8 equals what?"); the revealed
answer is announced; the card flip can be turned off and respects the device's
reduced-motion setting; colours meet WCAG AA contrast (checked by a test that reads the
stylesheet); tap targets are at least 44 px; the layout reflows at 320 px and with large
text. axe-core reported no violations on any page or state, in jsdom and in a real browser.
A real screen reader was not available, so that is the one accessibility check still to
do by hand.

## 10. Privacy and security

The app collects nothing: no accounts, no analytics, no cookies, no adverts, no outside
links and no network calls. A Privacy page explains this to parents and says that clearing
browser data erases progress. A test fails if the code gains any of those things. The site
is served with a strict Content-Security-Policy that allows only itself; in a real browser
an injected script and a request to another site were both blocked.

## 11. Deployment

The app is a static site. For hosting it has a Netlify/Cloudflare configuration
(`public/_headers`, `public/_redirects`), a Vercel configuration (`vercel.json`) and a
GitHub Pages workflow (`.github/workflows/math-practice-deploy.yml`) that tests, builds
with the right sub-path and an in-page security policy, and publishes. The Pages build was
served locally under `/cse_4095/` and checked on every route with a clean console.

**Status of the live site:** see `math-practice-app/README.md`, "Deployment status",
which is updated when the address has been verified. Publishing needs the repository
owner to enable GitHub Pages (or to use another host), because it needs their account.

## 12. Limitations and future work

- Sound effects are not implemented (the setting is saved but does nothing).
- Not tested in Safari, Firefox or Edge, on real phones and tablets, or with a real screen
  reader.
- Progress lives in one browser on one device; there is no sync, by design.
- The detailed attempt list keeps the newest 1,000 answers; older ones survive only as
  totals.

## 13. Evidence index

| Evidence | File |
|---|---|
| Specification and plan conversation (ChatGPT) | `Assignment 13/Project Docs/ChatGPT-Full-Transcript.md` |
| Earlier Cursor session (PDF, 246 pages) | `Assignment 13/Project Docs/cursor_math_practice_full_transcript.pdf` |
| Implementation conversation (Claude Code), readable export | `Assignment 13/AI-Conversation-Evidence/Claude-Code-Session-Transcript.md` |
| Source code and tests | `Assignment 13/math-practice-app/src` |
| Setup instructions | `Assignment 13/math-practice-app/README.md` |
| Release and browser checklist | `Assignment 13/math-practice-app/RELEASE.md` |
| Git history (one branch and merge per phase) | `git log --merges` |
