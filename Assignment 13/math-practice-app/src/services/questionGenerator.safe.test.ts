import { describe, expect, it, vi } from 'vitest'
import { seededRng } from '../test/rng'
import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import { isValidQuestion } from '../utils/validation'
import * as answerChoices from './answerChoices'
import { OPERATION_GENERATORS } from './operationGenerators'
import {
  generateNextQuestion,
  generateQuestion,
  generateQuestionSafely,
  QuestionGenerationError,
} from './questionGenerator'
import { nextReviewQuestion } from './reviewSession'
import {
  generateSimilarQuestion,
  generateSimilarQuestionSafely,
} from './similarQuestionGenerator'

const BAD_CHOICES = [1, 1, 2, 3]

function quietConsole() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('generateQuestion retries', () => {
  it('tries again when the answer choices turn out to be unusable', () => {
    const real = answerChoices.buildChoices
    const spy = vi
      .spyOn(answerChoices, 'buildChoices')
      .mockReturnValueOnce(BAD_CHOICES)
      .mockReturnValueOnce(BAD_CHOICES)
      .mockImplementation(real)

    const question = generateQuestion('addition', 1)
    expect(isValidQuestion(question)).toBe(true)
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('gives up after a fixed number of tries, with a clear error', () => {
    const spy = vi
      .spyOn(answerChoices, 'buildChoices')
      .mockReturnValue(BAD_CHOICES)

    expect(() => generateQuestion('addition', 1)).toThrow(
      QuestionGenerationError,
    )
    expect(() => generateQuestion('addition', 1)).toThrow(/invalid addition/)
    expect(spy).toHaveBeenCalledTimes(10) // 5 tries, twice
  })

  it('turns a crash while building choices into the same clear error', () => {
    vi.spyOn(answerChoices, 'buildChoices').mockImplementation(() => {
      throw new RangeError('boom')
    })
    expect(() => generateQuestion('division', 2)).toThrow(
      QuestionGenerationError,
    )
    expect(() => generateQuestion('division', 2)).toThrow(/boom/)
  })
})

describe('generateQuestionSafely', () => {
  it('is just generateQuestion when nothing goes wrong', () => {
    const log = quietConsole()
    const question = generateQuestionSafely('subtraction', 2, seededRng(3))
    expect(isValidQuestion(question)).toBe(true)
    expect(question.operation).toBe('subtraction')
    expect(log).not.toHaveBeenCalled()
  })

  it('uses a ready-made question when it cannot make one', () => {
    quietConsole()
    vi.spyOn(answerChoices, 'buildChoices').mockReturnValue(BAD_CHOICES)

    const question = generateQuestionSafely('multiplication', 3)
    expect(isValidQuestion(question)).toBe(true)
    expect(question).toMatchObject({
      operation: 'multiplication',
      difficulty: 3,
      displayText: '7 × 8 = ?',
    })
  })

  it('tells developers what went wrong, and with what', () => {
    const log = quietConsole()
    vi.spyOn(answerChoices, 'buildChoices').mockReturnValue(BAD_CHOICES)

    generateQuestionSafely('division', 4)

    expect(log).toHaveBeenCalledTimes(1)
    const [message, details] = log.mock.calls[0]
    expect(message).toMatch(/fallback was used/)
    expect(details).toMatchObject({ operation: 'division', difficulty: 4 })
    expect((details as { error: unknown }).error).toBeInstanceOf(
      QuestionGenerationError,
    )
  })

  it('copes with a generator that breaks completely', () => {
    quietConsole()
    vi.spyOn(OPERATION_GENERATORS, 'addition').mockImplementation(() => {
      throw new Error('generator exploded')
    })
    const question = generateQuestionSafely('addition', 2)
    expect(isValidQuestion(question)).toBe(true)
  })
})

describe('generateNextQuestion never fails', () => {
  it('keeps giving valid questions in the chosen operations when generation is broken', () => {
    quietConsole()
    vi.spyOn(answerChoices, 'buildChoices').mockReturnValue(BAD_CHOICES)

    let previous: Question | undefined
    for (let i = 0; i < 20; i++) {
      const question = generateNextQuestion(
        ['addition', 'division'],
        2,
        previous,
        seededRng(i),
      )
      expect(isValidQuestion(question)).toBe(true)
      expect(['addition', 'division']).toContain(question.operation)
      previous = question
    }
  })

  it('still reports a setup with no operations, which is a mistake in the app', () => {
    expect(() => generateNextQuestion([], 1)).toThrow(QuestionGenerationError)
  })
})

const PATTERN: MistakePattern = {
  id: 'multiplication:8:7:L2',
  operation: 'multiplication',
  firstOperand: 8,
  secondOperand: 7,
  correctAnswer: 56,
  difficulty: 2,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: '2026-03-01T10:00:00.000Z',
  mastered: false,
}

describe('generateSimilarQuestionSafely', () => {
  it('is just generateSimilarQuestion when nothing goes wrong', () => {
    const log = quietConsole()
    const question = generateSimilarQuestionSafely(PATTERN, seededRng(5))
    expect(question.source).toBe('mistake-review')
    expect(question.mistakePatternId).toBe(PATTERN.id)
    expect(isValidQuestion(question)).toBe(true)
    expect(log).not.toHaveBeenCalled()
  })

  it('asks the mistake itself again when it cannot make a similar one', () => {
    const log = quietConsole()
    vi.spyOn(answerChoices, 'buildChoices').mockReturnValue(BAD_CHOICES)

    const question = generateSimilarQuestionSafely(PATTERN)
    expect(question).toMatchObject({
      displayText: '8 × 7 = ?',
      correctAnswer: 56,
      source: 'mistake-review',
      mistakePatternId: PATTERN.id,
    })
    expect(isValidQuestion(question)).toBe(true)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][1]).toMatchObject({ pattern: PATTERN })
  })

  it('turns a crash while building the choices into a clear error', () => {
    vi.spyOn(answerChoices, 'buildChoices').mockImplementation(() => {
      throw new RangeError('no distractors')
    })
    expect(() => generateSimilarQuestion(PATTERN)).toThrow(
      // A related problem is chosen, so the exact numbers vary.
      /Could not build answer choices for \d+ [×÷+−] \d+ = \?: RangeError: no distractors/,
    )
  })

  it('is used for review sessions, so they never stop on a bad question', () => {
    quietConsole()
    vi.spyOn(answerChoices, 'buildChoices').mockReturnValue(BAD_CHOICES)
    expect(() => generateSimilarQuestion(PATTERN)).toThrow(
      QuestionGenerationError,
    )

    const next = nextReviewQuestion(
      { patterns: [PATTERN], recentKeys: [], lastPatternId: null },
      3,
    )
    expect(next?.question.mistakePatternId).toBe(PATTERN.id)
    expect(isValidQuestion(next!.question)).toBe(true)
  })
})
