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

- **Settings (Phase 11, done):** the Settings page saves automatically through `useSettings().updateSettings`; the session summary's **Change Settings** panel now links to both _Practice Setup_ and _App Settings_. `usePracticeDefaults` reads the saved defaults for the setup page. Card animation and explanations take effect during practice. **Sound effects** is saved but has no effect until sounds are added (no phase covers audio; the spec lists it under future work).
- **Mastery threshold (Phase 14):** the Settings page already saves `masteryThreshold` (1–20, default 3); Phase 14's mastery rules should read it from `useSettings()`.
- **Mistake patterns (Phase 12, done):** every answer the student marks wrong goes through `recordPracticeAttempt` (`services/attemptRecorder.ts`), which saves it, counts it in the statistics and calls `recordMistake`. A pattern's id is `operation:first:second:L<level>` (e.g. `multiplication:8:7:L2`), so the same mistake can never be stored twice; 7 × 8, 8 × 7 and the same fact at another level are different patterns. A repeat miss adds one to `incorrectCount`, updates `lastIncorrectAt`, and **resets** `similarCorrectCount` to 0 and `mastered` to false. Capped at 1,000 (mastered, then least recent, dropped first). `useMistakePatterns` loads them.
- **Mistake review (Phases 13–14):** `useActiveMistakeCount` is still a stub that returns 0 on purpose, so the app doesn't offer review it can't run yet. In Phase 14 make it count patterns that are not mastered, light up "Practice Mistakes" and the review option in setup, make the operation picker optional for review sessions, and update `similarCorrectCount` / `mastered` when review questions are answered (using the saved `masteryThreshold`). Answers to review questions (`source: 'mistake-review'`) are currently treated like any other answer; Phase 14 should decide whether a wrong review answer starts its own pattern.
- **Saved data (Phase 9):** the browser keeps `mathPractice.version`, `.settings`, `.sessions` and `.attempts`. The `.statistics` and `.mistakePatterns` keys are used from Phases 10 and 12. `AppProvider` loads and saves settings, and `clearAllData()` (Settings page) erases every `mathPractice.*` key and restores the defaults.
- **Storage warnings (Phase 19):** saving never throws, it reports why it failed (`unavailable`, `quota`, `error`). Nothing is shown to the student yet; Phase 19 should turn those results into a friendly message.
- **Statistics (Phase 10):** `recordAttempt` (in `statisticsService.ts`) saves an answer and adds it to running totals kept under `mathPractice.statistics`, exactly once. Sessions are capped at 200 and attempts at 5,000 (oldest dropped first), but the totals are never recounted from them, so trimming does not change the statistics. If the totals are missing or damaged they are rebuilt from the saved answers. Summarising old records is Phase 21.
- **Resetting (Phases 10 and 12):** "Reset Statistics" calls `resetPracticeHistory`, which erases sessions, attempts, statistics and `mathPractice.mistakePatterns`, and leaves settings alone. Mistake patterns are stored under that key, so a reset clears them.
- **Refresh mid-session (Phase 18):** a refresh keeps the setup but starts a fresh session until session recovery is added.
