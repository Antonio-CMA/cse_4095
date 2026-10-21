import type { DataCategory, DataProblem } from '../services/dataRepair'

const WHAT: Record<Exclude<DataCategory, 'settings'>, string> = {
  attempts: 'saved answers',
  sessions: 'practice history',
  mistakePatterns: 'saved mistakes',
}

/** One damaged kind of data, and what was done about it, in plain words. */
export function describeDataProblem(problem: DataProblem): string {
  if (problem.category === 'settings') {
    return problem.action === 'reset'
      ? "Your settings couldn't be read, so we set them back to the starting choices."
      : "Some of your settings couldn't be read, so we set those back to the starting choices."
  }
  const what = WHAT[problem.category]
  return problem.action === 'reset'
    ? `Your ${what} couldn't be read, so we cleared them.`
    : `Some of your ${what} couldn't be read, so we removed those and kept the rest.`
}
