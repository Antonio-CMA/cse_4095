import { randomInt, type Rng } from './math'

/** Returns a shuffled copy (Fisher–Yates); the original array is untouched. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i, rng)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
