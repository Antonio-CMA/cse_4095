# Math Practice App

A React + TypeScript app (built with Vite) for children ages 7–12 to practice addition, subtraction, multiplication, and division with flip-card multiple-choice questions. See `Assignment 13/Project Docs` for the full specification and implementation plan.

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the development server     |
| `npm run build`        | Type-check and build for release |
| `npm run lint`         | Lint with ESLint                 |
| `npm run format`       | Format with Prettier             |
| `npm run format:check` | Check formatting                 |
| `npm test`             | Run tests once with Vitest       |
| `npm run test:watch`   | Run Vitest in watch mode         |

## Project structure

```
src/
├── app/          App shell, routes, providers
├── components/   layout, practice, statistics, common
├── pages/        Route-level pages
├── services/     Question generation, statistics, storage
├── hooks/        Custom React hooks
├── types/        Shared TypeScript types
├── utils/        Math, shuffle, id, validation helpers
└── test/         Test setup
```

## Notes for later phases

- **Settings page (Phase 11):** the session summary's **Change Settings** button opens a small panel with two options, _Practice Setup_ (works now) and _App Settings_ (shown disabled, "Coming soon"). When the Settings page is designed, turn _App Settings_ into a link to `/settings`. It goes in that existing panel, behind the existing button (`src/components/practice/SummaryActions.tsx`).
- **Defaults (Phase 11):** `usePracticeDefaults` returns built-in defaults for now; switch it to read saved settings.
- **Mistake review (Phases 12–14):** `useActiveMistakeCount` is a stub that returns 0. The "Practice Mistakes" option and review mode in setup light up once mistakes are tracked, and review sessions should make the operation picker optional.
- **Saved data (Phase 9):** the browser keeps `mathPractice.version`, `.settings`, `.sessions` and `.attempts`. The `.mistakePatterns` and `.statistics` keys are reserved for Phases 10 and 12. `AppProvider` loads and saves settings; the Settings page (Phase 11) only needs to call `useSettings().updateSettings`.
- **Storage warnings (Phase 19):** saving never throws, it reports why it failed (`unavailable`, `quota`, `error`). Nothing is shown to the student yet; Phase 19 should turn those results into a friendly message.
- **Statistics (Phase 10):** `recordAttempt` (in `statisticsService.ts`) saves an answer and adds it to running totals kept under `mathPractice.statistics`, exactly once. Sessions are capped at 200 and attempts at 5,000 (oldest dropped first), but the totals are never recounted from them, so trimming does not change the statistics. If the totals are missing or damaged they are rebuilt from the saved answers. Summarising old records is Phase 21.
- **Resetting (Phases 10 and 12):** "Reset Statistics" calls `resetPracticeHistory`, which erases sessions, attempts, statistics and `mathPractice.mistakePatterns`, and leaves settings alone. Phase 12 must store mistake patterns under that key so a reset clears them.
- **Refresh mid-session (Phase 18):** a refresh keeps the setup but starts a fresh session until session recovery is added.
