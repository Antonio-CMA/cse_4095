import { describe, expect, it } from 'vitest'
import { sequenceRng } from '../test/rng'
import {
  getSessionEncouragement,
  pickFeedback,
  RIGHT_MESSAGES,
  WRONG_MESSAGES,
} from './feedback'

// Nothing a child reads should sound like blame.
const HARSH =
  /\b(wrong|bad|fail|failed|incorrect|stupid|dumb|worst|terrible)\b/i

describe('the friendly messages', () => {
  it('has several of each kind so it does not repeat constantly', () => {
    expect(RIGHT_MESSAGES.length).toBeGreaterThanOrEqual(4)
    expect(WRONG_MESSAGES.length).toBeGreaterThanOrEqual(4)
  })

  it('never uses discouraging words', () => {
    for (const message of [...RIGHT_MESSAGES, ...WRONG_MESSAGES]) {
      expect(message).not.toMatch(HARSH)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(RIGHT_MESSAGES).size).toBe(RIGHT_MESSAGES.length)
    expect(new Set(WRONG_MESSAGES).size).toBe(WRONG_MESSAGES.length)
  })
})

describe('pickFeedback', () => {
  it('uses a praising message for a right answer', () => {
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(RIGHT_MESSAGES).toContain(pickFeedback(true, null, () => roll))
    }
  })

  it('uses an encouraging message for a missed answer', () => {
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(WRONG_MESSAGES).toContain(pickFeedback(false, null, () => roll))
    }
  })

  it('can reach every message', () => {
    const seen = new Set<string>()
    for (let i = 0; i < RIGHT_MESSAGES.length; i++) {
      seen.add(pickFeedback(true, null, () => i / RIGHT_MESSAGES.length))
    }
    expect(seen.size).toBe(RIGHT_MESSAGES.length)
  })

  it('never repeats the previous message, whatever the dice say', () => {
    for (const previous of RIGHT_MESSAGES) {
      for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
        expect(pickFeedback(true, previous, () => roll)).not.toBe(previous)
      }
    }
    for (const previous of WRONG_MESSAGES) {
      for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
        expect(pickFeedback(false, previous, () => roll)).not.toBe(previous)
      }
    }
  })

  it('still works when the previous message was the other kind', () => {
    expect(RIGHT_MESSAGES).toContain(
      pickFeedback(true, WRONG_MESSAGES[0], sequenceRng([0])),
    )
  })

  it('works without a random source', () => {
    expect(RIGHT_MESSAGES).toContain(pickFeedback(true))
  })
})

describe('getSessionEncouragement', () => {
  it('says nothing when nothing was answered', () => {
    expect(getSessionEncouragement(null)).toBeNull()
  })

  it('has a message for every score, from perfect to none', () => {
    for (const accuracy of [100, 90, 80, 70, 60, 40, 1, 0]) {
      const message = getSessionEncouragement(accuracy)
      expect(message).toBeTruthy()
      expect(message).not.toMatch(HARSH)
    }
  })

  it('celebrates a perfect score', () => {
    expect(getSessionEncouragement(100)).toMatch(/perfect/i)
  })

  it('matches the message to how the session went', () => {
    const tiers = [100, 85, 65, 30, 0].map((a) => getSessionEncouragement(a))
    expect(new Set(tiers).size).toBe(tiers.length)
  })

  it('stays encouraging even when every answer was missed', () => {
    expect(getSessionEncouragement(0)).toMatch(/keep practicing/i)
  })
})
