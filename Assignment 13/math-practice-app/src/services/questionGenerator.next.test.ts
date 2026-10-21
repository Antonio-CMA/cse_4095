import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import {
  generateNextQuestion,
  generateRandomQuestion,
} from './questionGenerator'

describe('generateNextQuestion', () => {
  it('never repeats the previous problem back to back', () => {
    const rng = seededRng(5)
    // Level 1 division has few possible problems, so repeats are likely
    // unless they are deliberately avoided.
    let previous = generateRandomQuestion(['division'], 1, rng)
    for (let i = 0; i < 500; i++) {
      const next = generateNextQuestion(['division'], 1, previous, rng)
      const same =
        next.firstOperand === previous.firstOperand &&
        next.secondOperand === previous.secondOperand
      expect(same).toBe(false)
      previous = next
    }
  })

  it('gives a different question object (new id) each time', () => {
    const first = generateNextQuestion(['addition'], 2)
    const second = generateNextQuestion(['addition'], 2, first)
    expect(second.id).not.toBe(first.id)
  })

  it('works with no previous question', () => {
    const q = generateNextQuestion(['multiplication'], 3)
    expect(q.operation).toBe('multiplication')
    expect(q.choices).toHaveLength(4)
  })

  it('stays within the chosen operations', () => {
    const rng = seededRng(8)
    let previous = generateNextQuestion(
      ['addition', 'subtraction'],
      1,
      undefined,
      rng,
    )
    for (let i = 0; i < 100; i++) {
      previous = generateNextQuestion(
        ['addition', 'subtraction'],
        1,
        previous,
        rng,
      )
      expect(['addition', 'subtraction']).toContain(previous.operation)
    }
  })

  it('gives up avoiding a repeat rather than looping forever', () => {
    // A generator that always produces the same problem: still returns.
    const constant = () => 0
    const first = generateRandomQuestion(['addition'], 1, constant)
    const next = generateNextQuestion(['addition'], 1, first, constant)
    expect(next.firstOperand).toBe(first.firstOperand)
  })
})
