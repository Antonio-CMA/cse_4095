import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import type { QuestionDraft } from '../types/question'
import { buildChoices } from './answerChoices'
import { generateQuestionDraft } from './questionGenerator'

const SEVEN_TIMES_EIGHT: QuestionDraft = {
  id: 'q',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  difficulty: 2,
  source: 'regular',
}

describe('buildChoices', () => {
  it('returns four different choices that include the right answer once', () => {
    const rng = seededRng(1)
    for (let i = 0; i < 300; i++) {
      const q = generateQuestionDraft('multiplication', 2, rng)
      const choices = buildChoices(q, rng)
      expect(choices).toHaveLength(4)
      expect(new Set(choices).size).toBe(4)
      expect(choices.filter((c) => c === q.correctAnswer)).toHaveLength(1)
    }
  })

  it('does not keep the right answer in a predictable position', () => {
    const rng = seededRng(2)
    const counts = [0, 0, 0, 0]
    const samples = 2000
    for (let i = 0; i < samples; i++) {
      counts[buildChoices(SEVEN_TIMES_EIGHT, rng).indexOf(56)]++
    }
    // Each position should get roughly a quarter of the answers (500).
    for (const count of counts) {
      expect(count).toBeGreaterThan(400)
      expect(count).toBeLessThan(600)
    }
  })

  it('shuffles the same question differently each time', () => {
    const rng = seededRng(3)
    const orders = new Set<string>()
    for (let i = 0; i < 50; i++) {
      orders.add(buildChoices(SEVEN_TIMES_EIGHT, rng).join(','))
    }
    expect(orders.size).toBeGreaterThan(5)
  })
})
