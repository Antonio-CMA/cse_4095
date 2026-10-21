import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import { makeAttempt } from '../test/sessionResult'
import { recordPracticeAttempt } from './attemptRecorder'
import { loadMistakePatterns, saveMistakePatterns } from './mistakeService'
import { loadAttempts } from './practiceHistory'
import { DEFAULT_SETTINGS, saveSettings } from './settingsService'
import { loadStatistics } from './statisticsService'

const review = (patternId: string, correct: boolean) =>
  makeAttempt({
    source: 'mistake-review',
    mistakePatternId: patternId,
    selfReportedCorrect: correct,
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 6,
    correctAnswer: 48,
    difficulty: 2,
  })

describe('recordPracticeAttempt for review answers', () => {
  it('saves the answer with the pattern it belongs to, and counts it in the statistics', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    recordPracticeAttempt(review(pattern.id, true))

    expect(loadAttempts()[0]).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    })
    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 1 })
  })

  it('credits right answers to the pattern', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])

    recordPracticeAttempt(review(pattern.id, true))
    recordPracticeAttempt(review(pattern.id, true))

    expect(loadMistakePatterns()[0].similarCorrectCount).toBe(2)
  })

  it('counts an answer only once even if it is recorded again', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    const answer = review(pattern.id, true)

    recordPracticeAttempt(answer)
    recordPracticeAttempt(answer)
    recordPracticeAttempt(answer)

    expect(loadMistakePatterns()[0].similarCorrectCount).toBe(1)
    expect(loadStatistics().attempted).toBe(1)
  })

  it('masters the pattern after the default three right answers', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    for (let i = 0; i < 3; i++) recordPracticeAttempt(review(pattern.id, true))
    expect(loadMistakePatterns()[0].mastered).toBe(true)
  })

  it('follows the mastery setting the student saved', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 1 })

    recordPracticeAttempt(review(pattern.id, true))
    expect(loadMistakePatterns()[0].mastered).toBe(true)
  })

  it('a higher mastery setting needs more right answers', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 5 })

    for (let i = 0; i < 4; i++) recordPracticeAttempt(review(pattern.id, true))
    expect(loadMistakePatterns()[0].mastered).toBe(false)
    recordPracticeAttempt(review(pattern.id, true))
    expect(loadMistakePatterns()[0].mastered).toBe(true)
  })

  it('a wrong review answer sets the pattern back', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])

    recordPracticeAttempt(review(pattern.id, true))
    recordPracticeAttempt(review(pattern.id, true))
    recordPracticeAttempt(review(pattern.id, false))

    expect(loadMistakePatterns()).toHaveLength(1)
    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 0,
      incorrectCount: 2,
      mastered: false,
    })
  })

  it('a mastered pattern becomes active again after a later mistake', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    for (let i = 0; i < 3; i++) recordPracticeAttempt(review(pattern.id, true))
    expect(loadMistakePatterns()[0].mastered).toBe(true)

    // An ordinary question for the same fact, answered wrong.
    recordPracticeAttempt(
      makeAttempt({
        source: 'regular',
        selfReportedCorrect: false,
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
      }),
    )
    expect(loadMistakePatterns()[0]).toMatchObject({
      mastered: false,
      similarCorrectCount: 0,
      incorrectCount: 2,
    })
  })
})
