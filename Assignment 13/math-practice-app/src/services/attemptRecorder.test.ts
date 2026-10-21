import { describe, expect, it, vi } from 'vitest'
import { makeAttempt } from '../test/sessionResult'
import { recordPracticeAttempt } from './attemptRecorder'
import { loadMistakePatterns } from './mistakeService'
import { loadAttempts } from './practiceHistory'
import { loadStatistics } from './statisticsService'

const right = (extra = {}) =>
  makeAttempt({ selfReportedCorrect: true, ...extra })
const wrong = (extra = {}) =>
  makeAttempt({ selfReportedCorrect: false, ...extra })

describe('recordPracticeAttempt', () => {
  it('saves a right answer and counts it, without starting a mistake pattern', () => {
    expect(recordPracticeAttempt(right())).toEqual({ ok: true })

    expect(loadAttempts()).toHaveLength(1)
    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 1 })
    expect(loadMistakePatterns()).toEqual([])
  })

  it('saves a wrong answer, counts it, and remembers the mistake', () => {
    recordPracticeAttempt(
      wrong({
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
        difficulty: 3,
      }),
    )

    expect(loadAttempts()).toHaveLength(1)
    expect(loadStatistics()).toMatchObject({ attempted: 1, incorrect: 1 })
    expect(loadMistakePatterns()).toHaveLength(1)
    expect(loadMistakePatterns()[0]).toMatchObject({
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
      difficulty: 3,
      incorrectCount: 1,
    })
  })

  it('counts a repeated update of the same answer only once', () => {
    const attempt = wrong()
    recordPracticeAttempt(attempt)
    recordPracticeAttempt(attempt)
    recordPracticeAttempt(attempt)

    expect(loadAttempts()).toHaveLength(1)
    expect(loadStatistics().attempted).toBe(1)
    expect(loadMistakePatterns()).toHaveLength(1)
    expect(loadMistakePatterns()[0].incorrectCount).toBe(1)
  })

  it('counts the same question missed in two separate answers twice', () => {
    const fact = {
      operation: 'multiplication' as const,
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2 as const,
    }
    recordPracticeAttempt(wrong(fact))
    recordPracticeAttempt(wrong(fact))

    expect(loadAttempts()).toHaveLength(2)
    expect(loadMistakePatterns()).toHaveLength(1)
    expect(loadMistakePatterns()[0].incorrectCount).toBe(2)
  })

  it('does not change a pattern when the same question is later answered right', () => {
    const fact = {
      operation: 'multiplication' as const,
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2 as const,
    }
    recordPracticeAttempt(wrong(fact))
    recordPracticeAttempt(right(fact))

    expect(loadMistakePatterns()[0]).toMatchObject({
      incorrectCount: 1,
      similarCorrectCount: 0,
    })
  })

  it('does not remember a mistake for an answer that could not be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(recordPracticeAttempt(wrong())).toMatchObject({ ok: false })
    vi.restoreAllMocks()

    expect(loadAttempts()).toEqual([])
    expect(loadMistakePatterns()).toEqual([])
  })

  it('reports it if only the mistake pattern could not be saved', () => {
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'mathPractice.mistakePatterns') {
        throw new DOMException('denied', 'SecurityError')
      }
      original.call(this, key, value)
    })

    expect(recordPracticeAttempt(wrong())).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    // The answer itself and the statistics were still saved.
    expect(loadAttempts()).toHaveLength(1)
    expect(loadStatistics().attempted).toBe(1)
  })
})
