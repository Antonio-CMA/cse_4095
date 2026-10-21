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
- **Refresh mid-session (Phase 18):** a refresh keeps the setup but starts a fresh session until session recovery is added.
