import { describe, expect, it, vi } from 'vitest'
import { makeAttempt, makeResult } from '../test/sessionResult'
import {
  loadAttempts,
  loadSessions,
  resetPracticeHistory,
  saveSession,
} from './practiceHistory'
import { saveSettings, DEFAULT_SETTINGS, loadSettings } from './settingsService'
import { loadStatistics, recordAttempt } from './statisticsService'
import { STORAGE_KEYS, writeItem } from './storageService'

describe('resetPracticeHistory', () => {
  function fillWithData() {
    saveSession(makeResult([true, false]).session)
    recordAttempt(makeAttempt())
    recordAttempt(makeAttempt({ selfReportedCorrect: false }))
    writeItem(STORAGE_KEYS.mistakePatterns, [{ anything: true }])
    writeItem(STORAGE_KEYS.activeSession, { anything: true })
    writeItem(STORAGE_KEYS.version, { version: 1 })
    saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: false })
    window.localStorage.setItem('someOtherApp.data', 'keep me')
  }

  it('erases sessions, attempts, statistics, mistake patterns and the session bookmark', () => {
    fillWithData()
    expect(resetPracticeHistory()).toBe(true)

    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
    expect(loadStatistics().attempted).toBe(0)
    expect(window.localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('leaves the settings, the version and unrelated data alone', () => {
    fillWithData()
    resetPracticeHistory()

    expect(loadSettings().settings.soundEnabled).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEYS.version)).toBe(
      '{"version":1}',
    )
    expect(window.localStorage.getItem('someOtherApp.data')).toBe('keep me')
  })

  it('is fine to run when there is nothing to erase', () => {
    expect(resetPracticeHistory()).toBe(true)
  })

  it('lets practice start counting again from zero afterwards', () => {
    fillWithData()
    resetPracticeHistory()
    recordAttempt(makeAttempt())
    expect(loadStatistics()).toMatchObject({ attempted: 1, correct: 1 })
  })

  it('reports failure, but still tries every item, if the browser refuses', () => {
    fillWithData()
    const remove = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError')
      })

    expect(resetPracticeHistory()).toBe(false)
    expect(remove).toHaveBeenCalledTimes(5)
  })
})
