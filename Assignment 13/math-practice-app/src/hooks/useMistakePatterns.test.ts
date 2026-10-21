import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { recordMistake } from '../services/mistakeService'
import { STORAGE_KEYS } from '../services/storageService'
import { makeAttempt } from '../test/sessionResult'
import { useMistakePatterns } from './useMistakePatterns'

describe('useMistakePatterns', () => {
  it('is empty when no mistakes have been saved', () => {
    const { result } = renderHook(() => useMistakePatterns())
    expect(result.current).toEqual([])
  })

  it('loads the saved mistake patterns', () => {
    recordMistake(makeAttempt({ selfReportedCorrect: false }))
    recordMistake(
      makeAttempt({
        selfReportedCorrect: false,
        operation: 'subtraction',
        firstOperand: 9,
        secondOperand: 4,
        correctAnswer: 5,
      }),
    )

    const { result } = renderHook(() => useMistakePatterns())
    expect(result.current).toHaveLength(2)
  })

  it('copes with damaged saved data', () => {
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, '{{ broken')
    const { result } = renderHook(() => useMistakePatterns())
    expect(result.current).toEqual([])
  })
})
