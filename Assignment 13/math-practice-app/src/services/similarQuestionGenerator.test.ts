import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { calculateAnswer } from '../utils/math'
import { getMistakePatternId } from '../utils/mistakes'
import { isValidQuestion } from '../utils/validation'
import {
  generateQuestionDraft,
  QuestionGenerationError,
} from './questionGenerator'
import {
  factFamilyProblems,
  generateSimilarQuestion,
  getProblemKey,
  nearbyProblems,
  pickSimilarProblem,
  reversedProblems,
  type Problem,
} from './similarQuestionGenerator'

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]

function pattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  difficulty: DifficultyLevel = 2,
): MistakePattern {
  return {
    id: getMistakePatternId({
      operation,
      firstOperand,
      secondOperand,
      difficulty,
    }),
    operation,
    firstOperand,
    secondOperand,
    correctAnswer: calculateAnswer(operation, firstOperand, secondOperand),
    difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-03-01T10:00:00.000Z',
    mastered: false,
  }
}

const key = (p: Problem) => `${p.operation}:${p.first}:${p.second}`

describe('getProblemKey', () => {
  it('names a problem by its operation and numbers', () => {
    expect(
      getProblemKey({
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
      }),
    ).toBe('multiplication:8:7')
  })
})

describe('nearbyProblems', () => {
  it('moves the numbers a little, as in the specification example (8 × 7)', () => {
    const keys = nearbyProblems(pattern('multiplication', 8, 7)).map(key)
    for (const expected of [
      'multiplication:8:6',
      'multiplication:9:7',
      'multiplication:7:7',
      'multiplication:8:8',
    ]) {
      expect(keys).toContain(expected)
    }
  })

  it('never includes the original problem', () => {
    for (const op of OPERATIONS) {
      const p = pattern(op, 56, 7)
      expect(nearbyProblems(p).map(key)).not.toContain(`${op}:56:7`)
    }
  })

  it('stays in the same operation', () => {
    for (const op of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ] as const) {
      const problems = nearbyProblems(pattern(op, 56, 7))
      expect(problems.every((p) => p.operation === op)).toBe(true)
    }
  })

  it('keeps small numbers within two of the originals', () => {
    for (const p of nearbyProblems(pattern('addition', 8, 7))) {
      expect(Math.abs(p.first - 8)).toBeLessThanOrEqual(2)
      expect(Math.abs(p.second - 7)).toBeLessThanOrEqual(2)
    }
  })

  it('takes bigger steps for big numbers', () => {
    const problems = nearbyProblems(pattern('addition', 450, 300, 4))
    expect(problems.some((p) => Math.abs(p.first - 450) === 10)).toBe(true)
    expect(problems.every((p) => Math.abs(p.first - 450) <= 10)).toBe(true)
  })

  it('never produces negative numbers, even for answers near zero', () => {
    for (const p of nearbyProblems(pattern('subtraction', 0, 0, 1))) {
      expect(p.first).toBeGreaterThanOrEqual(0)
      expect(p.second).toBeGreaterThanOrEqual(0)
    }
  })

  it('builds division from a divisor and an answer, so it always divides evenly', () => {
    const problems = nearbyProblems(pattern('division', 56, 7))
    expect(problems.length).toBeGreaterThan(0)
    for (const p of problems) {
      expect(p.second).toBeGreaterThanOrEqual(1) // never divides by zero
      expect(p.first % p.second).toBe(0)
      expect(p.first / p.second).toBeGreaterThanOrEqual(1)
    }
  })

  it('moves the divisor and the answer, not the dividend', () => {
    const keys = nearbyProblems(pattern('division', 56, 7)).map(key)
    expect(keys).toContain('division:48:6') // 6 × 8
    expect(keys).toContain('division:63:7') // 7 × 9
  })
})

describe('reversedProblems', () => {
  it('swaps addition and multiplication', () => {
    expect(reversedProblems(pattern('multiplication', 8, 7)).map(key)).toEqual([
      'multiplication:7:8',
    ])
    expect(reversedProblems(pattern('addition', 3, 9)).map(key)).toEqual([
      'addition:9:3',
    ])
  })

  it('has nothing to swap when the numbers are equal', () => {
    expect(reversedProblems(pattern('multiplication', 6, 6))).toEqual([])
    expect(reversedProblems(pattern('addition', 4, 4))).toEqual([])
  })

  it('does not treat reversed subtraction as the same problem', () => {
    expect(reversedProblems(pattern('subtraction', 9, 4))).toEqual([])
  })

  it('does not treat reversed division as the same problem', () => {
    expect(reversedProblems(pattern('division', 56, 7))).toEqual([])
  })
})

describe('factFamilyProblems', () => {
  it('turns a multiplication into the two divisions (8 × 7 → 56 ÷ 7, 56 ÷ 8)', () => {
    expect(
      factFamilyProblems(pattern('multiplication', 8, 7)).map(key),
    ).toEqual(['division:56:8', 'division:56:7'])
  })

  it('turns a division into the two multiplications', () => {
    expect(factFamilyProblems(pattern('division', 56, 7)).map(key)).toEqual([
      'multiplication:7:8',
      'multiplication:8:7',
    ])
  })

  it('turns an addition into the two subtractions', () => {
    expect(factFamilyProblems(pattern('addition', 4, 5)).map(key)).toEqual([
      'subtraction:9:4',
      'subtraction:9:5',
    ])
  })

  it('turns a subtraction into the two additions', () => {
    expect(factFamilyProblems(pattern('subtraction', 9, 4)).map(key)).toEqual([
      'addition:4:5',
      'addition:5:4',
    ])
  })

  it('always uses the same three numbers', () => {
    for (const op of OPERATIONS) {
      const p = pattern(op, 56, 7)
      const numbers = new Set([
        p.firstOperand,
        p.secondOperand,
        p.correctAnswer,
      ])
      for (const related of factFamilyProblems(p)) {
        const relatedAnswer = calculateAnswer(
          related.operation,
          related.first,
          related.second,
        )
        expect(new Set([related.first, related.second, relatedAnswer])).toEqual(
          numbers,
        )
      }
    }
  })
})

describe('pickSimilarProblem', () => {
  it('only offers problems that are real questions at the same level', () => {
    for (const op of OPERATIONS) {
      for (const level of LEVELS) {
        const rng = seededRng(level * 31)
        for (let i = 0; i < 40; i++) {
          const draft = generateQuestionDraft(op, level, rng)
          const p = pattern(op, draft.firstOperand, draft.secondOperand, level)
          const { problem } = pickSimilarProblem(p, rng)
          const answer = calculateAnswer(
            problem.operation,
            problem.first,
            problem.second,
          )
          // Reuse the full validation by building a question from it.
          const question = generateSimilarQuestion(p, rng)
          expect(isValidQuestion(question)).toBe(true)
          expect(Number.isInteger(answer)).toBe(true)
          expect(answer).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('never offers the original problem', () => {
    const p = pattern('multiplication', 8, 7)
    const rng = seededRng(1)
    for (let i = 0; i < 300; i++) {
      expect(key(pickSimilarProblem(p, rng).problem)).not.toBe(
        'multiplication:8:7',
      )
    }
  })

  it('uses all three kinds of similarity over time when they are available', () => {
    const rng = seededRng(2)
    const strategies = new Set<string>()
    for (let i = 0; i < 200; i++) {
      strategies.add(
        pickSimilarProblem(pattern('multiplication', 8, 7), rng).strategy,
      )
    }
    expect([...strategies].sort()).toEqual([
      'fact-family',
      'nearby',
      'reversed',
    ])
  })

  it('covers the specification examples for 8 × 7', () => {
    const rng = seededRng(3)
    const seen = new Set<string>()
    for (let i = 0; i < 600; i++) {
      seen.add(
        key(pickSimilarProblem(pattern('multiplication', 8, 7), rng).problem),
      )
    }
    for (const expected of [
      'multiplication:7:8',
      'multiplication:8:6',
      'multiplication:9:7',
      'division:56:7',
      'division:56:8',
    ]) {
      expect(seen.has(expected)).toBe(true)
    }
  })

  it('never reverses a subtraction or a division', () => {
    const rng = seededRng(4)
    for (let i = 0; i < 300; i++) {
      expect(
        pickSimilarProblem(pattern('subtraction', 9, 4), rng).strategy,
      ).not.toBe('reversed')
      expect(
        pickSimilarProblem(pattern('division', 56, 7), rng).strategy,
      ).not.toBe('reversed')
    }
  })

  it('stays within the level: no big numbers for a Beginner question', () => {
    const rng = seededRng(5)
    const p = pattern('addition', 7, 8, 1)
    for (let i = 0; i < 300; i++) {
      const { problem } = pickSimilarProblem(p, rng)
      // e.g. 15 − 7 would use 15, which is above the Beginner limit of 10
      expect(problem.first).toBeLessThanOrEqual(10)
      expect(problem.second).toBeLessThanOrEqual(10)
    }
  })

  it('never divides by zero', () => {
    const rng = seededRng(6)
    for (const p of [
      pattern('multiplication', 0, 5, 1),
      pattern('division', 5, 1, 1),
      pattern('multiplication', 5, 0, 2),
    ]) {
      for (let i = 0; i < 100; i++) {
        const { problem } = pickSimilarProblem(p, rng)
        if (problem.operation === 'division')
          expect(problem.second).toBeGreaterThan(0)
      }
    }
  })

  describe('avoiding problems shown recently', () => {
    const p = pattern('addition', 4, 5, 1)
    const rng0 = seededRng(7)
    const everything = new Set<string>()
    for (let i = 0; i < 400; i++)
      everything.add(key(pickSimilarProblem(p, rng0).problem))

    it('has several different problems to choose from', () => {
      expect(everything.size).toBeGreaterThan(5)
    })

    it('skips the ones to avoid when others exist', () => {
      const avoid = [...everything].slice(0, 3)
      const rng = seededRng(8)
      for (let i = 0; i < 200; i++) {
        expect(avoid).not.toContain(
          key(pickSimilarProblem(p, rng, avoid).problem),
        )
      }
    })

    it('returns the only remaining problem when all the others are avoided', () => {
      const [keep, ...rest] = [...everything]
      const rng = seededRng(9)
      for (let i = 0; i < 50; i++) {
        expect(key(pickSimilarProblem(p, rng, rest).problem)).toBe(keep)
      }
    })

    it('still returns something when everything is avoided', () => {
      const result = pickSimilarProblem(p, seededRng(10), [...everything])
      expect(everything.has(key(result.problem))).toBe(true)
    })
  })

  it('falls back to the original problem if nothing related fits the level', () => {
    // 100 × 100 is far outside Beginner, so no neighbour can be a Beginner question.
    const impossible = pattern('multiplication', 100, 100, 1)
    expect(key(pickSimilarProblem(impossible, seededRng(11)).problem)).toBe(
      'multiplication:100:100',
    )
  })

  it('is repeatable with the same seed', () => {
    const p = pattern('multiplication', 8, 7)
    expect(pickSimilarProblem(p, seededRng(12))).toEqual(
      pickSimilarProblem(p, seededRng(12)),
    )
  })
})

describe.each(OPERATIONS)('generateSimilarQuestion for %s', (operation) => {
  it.each(LEVELS)('makes valid review questions at level %i', (level) => {
    const rng = seededRng(level * 7 + 1)
    for (let i = 0; i < 80; i++) {
      const draft = generateQuestionDraft(operation, level, rng)
      const p = pattern(
        operation,
        draft.firstOperand,
        draft.secondOperand,
        level,
      )
      const question = generateSimilarQuestion(p, rng)

      expect(isValidQuestion(question)).toBe(true)
      expect(question.source).toBe('mistake-review')
      expect(question.mistakePatternId).toBe(p.id)
      expect(question.difficulty).toBe(level)
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices).size).toBe(4)
      expect(question.choices).toContain(question.correctAnswer)
      // Related, but not the identical question.
      expect(getProblemKey(question)).not.toBe(getProblemKey(p))
    }
  })
})

describe('generateSimilarQuestion', () => {
  it('gives each question its own id', () => {
    const p = pattern('multiplication', 8, 7)
    expect(generateSimilarQuestion(p).id).not.toBe(
      generateSimilarQuestion(p).id,
    )
  })

  it('shows the question in the usual format', () => {
    const q = generateSimilarQuestion(
      pattern('addition', 4, 5, 1),
      seededRng(20),
    )
    expect(q.displayText).toMatch(/^\d+ [+−×÷] \d+ = \?$/)
  })

  it('skips recently shown problems', () => {
    const p = pattern('multiplication', 8, 7)
    const rng = seededRng(21)
    const avoid = ['multiplication:7:8', 'division:56:7', 'division:56:8']
    for (let i = 0; i < 100; i++) {
      expect(avoid).not.toContain(
        getProblemKey(generateSimilarQuestion(p, rng, avoid)),
      )
    }
  })

  it('reports a clear error rather than a bad question if the pattern does not fit its level', () => {
    expect(() =>
      generateSimilarQuestion(pattern('multiplication', 100, 100, 1)),
    ).toThrow(QuestionGenerationError)
  })
})
