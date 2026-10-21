import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { saveMistakePatterns } from '../services/mistakeService'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import { STORAGE_KEYS } from '../services/storageService'
import { makePattern } from '../test/mistakePatterns'
import { useActiveMistakeCount } from './useActiveMistakeCount'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)
const count = () =>
  renderHook(() => useActiveMistakeCount(), { wrapper }).result.current

describe('useActiveMistakeCount', () => {
  it('is zero when there are no mistakes', () => {
    expect(count()).toBe(0)
  })

  it('counts the mistakes that still need practice', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7),
      makePattern('addition', 4, 5, 1),
      makePattern('division', 56, 7),
    ])
    expect(count()).toBe(3)
  })

  it('leaves out mastered mistakes', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7),
      makePattern('addition', 4, 5, 1, { mastered: true }),
      makePattern('division', 56, 7, 2, { similarCorrectCount: 3 }),
    ])
    expect(count()).toBe(1)
  })

  it('follows the mastery setting', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { similarCorrectCount: 2 }),
    ])
    expect(count()).toBe(1)

    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 2 })
    expect(count()).toBe(0)
  })

  it('is zero if the saved mistakes are damaged', () => {
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, '{{ broken')
    expect(count()).toBe(0)
  })
})
