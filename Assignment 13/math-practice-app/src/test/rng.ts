import type { Rng } from '../utils/math'

/** A small deterministic generator (mulberry32) for repeatable tests. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Returns the given values in order, cycling when they run out. */
export function sequenceRng(values: number[]): Rng {
  let i = 0
  return () => values[i++ % values.length]
}
