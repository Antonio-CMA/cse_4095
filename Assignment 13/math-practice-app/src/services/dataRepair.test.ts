import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../test/sessionResult'
import { makePattern } from '../test/mistakePatterns'
import { repairStoredData } from './dataRepair'
import { loadMistakePatterns, saveMistakePatterns } from './mistakeService'
import {
  loadAttempts,
  loadSessions,
  saveAttempts,
  saveSession,
} from './practiceHistory'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settingsService'
import { loadStatistics, recordAttempt } from './statisticsService'
import { STORAGE_KEYS, writeItem } from './storageService'

const raw = (key: string) => window.localStorage.getItem(key)
const put = (key: string, text: string) =>
  window.localStorage.setItem(key, text)

/** Healthy data of every kind. */
function fillWithGoodData() {
  saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: false })
  saveSession(makeResult([true, false]).session)
  recordAttempt(makeAttempt())
  recordAttempt(makeAttempt({ selfReportedCorrect: false }))
  saveMistakePatterns([makePattern('multiplication', 8, 7)])
}

describe('healthy or empty storage', () => {
  it('has nothing to report when nothing is saved', () => {
    expect(repairStoredData('fresh')).toEqual([])
  })

  it('has nothing to report, and changes nothing, when all is well', () => {
    fillWithGoodData()
    const before = { ...window.localStorage }

    expect(repairStoredData('current')).toEqual([])
    expect({ ...window.localStorage }).toEqual(before)
  })
})

describe('a kind of data that cannot be read at all is reset, on its own', () => {
  it.each([
    ['attempts', STORAGE_KEYS.attempts],
    ['sessions', STORAGE_KEYS.sessions],
    ['mistakePatterns', STORAGE_KEYS.mistakePatterns],
  ] as const)('%s that are not JSON', (category, key) => {
    fillWithGoodData()
    put(key, '{{{ cut off')

    expect(repairStoredData('current')).toEqual([
      { category, action: 'reset', dropped: 0 },
    ])
    expect(raw(key)).toBeNull()
  })

  it.each([
    ['attempts', STORAGE_KEYS.attempts],
    ['sessions', STORAGE_KEYS.sessions],
    ['mistakePatterns', STORAGE_KEYS.mistakePatterns],
  ] as const)('%s that are not even a list', (category, key) => {
    put(key, '{"not":"a list"}')
    expect(repairStoredData('current')).toEqual([
      { category, action: 'reset', dropped: 0 },
    ])
    expect(raw(key)).toBeNull()
  })

  it('settings that are not JSON', () => {
    put(STORAGE_KEYS.settings, 'definitely not json')
    expect(repairStoredData('current')).toEqual([
      { category: 'settings', action: 'reset', dropped: 0 },
    ])
    expect(raw(STORAGE_KEYS.settings)).toBeNull()
  })

  it('settings that are not an object', () => {
    put(STORAGE_KEYS.settings, '[1,2,3]')
    expect(repairStoredData('current')).toEqual([
      { category: 'settings', action: 'reset', dropped: 0 },
    ])
  })

  it('leaves every other kind of data exactly as it was', () => {
    fillWithGoodData()
    const settingsBefore = raw(STORAGE_KEYS.settings)
    const sessionsBefore = raw(STORAGE_KEYS.sessions)
    const patternsBefore = raw(STORAGE_KEYS.mistakePatterns)
    const statisticsBefore = raw(STORAGE_KEYS.statistics)

    put(STORAGE_KEYS.attempts, 'garbage')
    repairStoredData('current')

    expect(raw(STORAGE_KEYS.settings)).toBe(settingsBefore)
    expect(raw(STORAGE_KEYS.sessions)).toBe(sessionsBefore)
    expect(raw(STORAGE_KEYS.mistakePatterns)).toBe(patternsBefore)
    expect(raw(STORAGE_KEYS.statistics)).toBe(statisticsBefore)
  })

  it('can reset several kinds at once, each reported', () => {
    put(STORAGE_KEYS.attempts, 'x')
    put(STORAGE_KEYS.sessions, 'y')
    expect(
      repairStoredData('current')
        .map((p) => p.category)
        .sort(),
    ).toEqual(['attempts', 'sessions'])
  })
})

describe('a list with some unusable records keeps the good ones', () => {
  it('for answers', () => {
    const good = makeAttempt()
    put(
      STORAGE_KEYS.attempts,
      JSON.stringify([good, { nonsense: true }, 7, null]),
    )

    expect(repairStoredData('current')).toEqual([
      { category: 'attempts', action: 'repaired', dropped: 3 },
    ])
    expect(loadAttempts()).toEqual([good])
    expect(JSON.parse(raw(STORAGE_KEYS.attempts)!)).toEqual([good])
  })

  it('for sessions', () => {
    const session = makeResult([true]).session
    put(STORAGE_KEYS.sessions, JSON.stringify([session, { id: 5 }]))

    expect(repairStoredData('current')).toEqual([
      { category: 'sessions', action: 'repaired', dropped: 1 },
    ])
    expect(loadSessions()).toEqual([session])
  })

  it('for mistake patterns', () => {
    const good = makePattern('addition', 4, 5, 1)
    const wrongAnswer = {
      ...makePattern('addition', 6, 7, 1),
      correctAnswer: 99,
    }
    put(STORAGE_KEYS.mistakePatterns, JSON.stringify([good, wrongAnswer]))

    expect(repairStoredData('current')).toEqual([
      { category: 'mistakePatterns', action: 'repaired', dropped: 1 },
    ])
    expect(loadMistakePatterns()).toEqual([good])
  })

  it('does not call two copies of the same mistake damage', () => {
    const pattern = makePattern('addition', 4, 5, 1)
    writeItem(STORAGE_KEYS.mistakePatterns, [pattern, pattern])
    expect(repairStoredData('current')).toEqual([])
  })
})

describe('settings keep every field that is fine', () => {
  it('puts back only the damaged ones', () => {
    put(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        soundEnabled: false,
        defaultDifficulty: 99,
        defaultSessionLength: 'forever',
        masteryThreshold: 5,
      }),
    )

    expect(repairStoredData('current')).toEqual([
      { category: 'settings', action: 'repaired', dropped: 2 },
    ])
    expect(loadSettings().settings).toEqual({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
      masteryThreshold: 5,
    })
    // ...and the saved copy is now clean too.
    expect(JSON.parse(raw(STORAGE_KEYS.settings)!).defaultDifficulty).toBe(
      DEFAULT_SETTINGS.defaultDifficulty,
    )
  })

  it('does not count a setting that is simply missing as damage', () => {
    // Saved before a newer setting existed.
    const { feedbackEnabled, ...older } = DEFAULT_SETTINGS
    void feedbackEnabled
    put(STORAGE_KEYS.settings, JSON.stringify(older))

    expect(repairStoredData('current')).toEqual([])
    expect(raw(STORAGE_KEYS.settings)).toBe(JSON.stringify(older))
  })

  it('ignores settings it does not know about', () => {
    put(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'x' }),
    )
    expect(repairStoredData('current')).toEqual([])
  })
})

describe('totals and the session bookmark are fixed quietly', () => {
  it('counts the totals again from the saved answers when they are damaged', () => {
    saveAttempts([
      makeAttempt(),
      makeAttempt(),
      makeAttempt({ selfReportedCorrect: false }),
    ])
    put(STORAGE_KEYS.statistics, '{"attempted":"lots"}')

    expect(repairStoredData('current')).toEqual([])
    expect(JSON.parse(raw(STORAGE_KEYS.statistics)!)).toMatchObject({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(loadStatistics()).toMatchObject({ attempted: 3, correct: 2 })
  })

  it('rebuilds from the answers that survived a repair', () => {
    put(
      STORAGE_KEYS.attempts,
      JSON.stringify([makeAttempt(), { nonsense: true }]),
    )
    put(STORAGE_KEYS.statistics, 'broken')

    repairStoredData('current')
    expect(loadStatistics().attempted).toBe(1)
  })

  it('leaves healthy totals alone', () => {
    fillWithGoodData()
    const before = raw(STORAGE_KEYS.statistics)
    repairStoredData('current')
    expect(raw(STORAGE_KEYS.statistics)).toBe(before)
  })

  it('removes a session bookmark that cannot be used', () => {
    put(STORAGE_KEYS.activeSession, '{"key":"x","session":5}')
    expect(repairStoredData('current')).toEqual([])
    expect(raw(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('leaves a missing bookmark missing', () => {
    repairStoredData('current')
    expect(raw(STORAGE_KEYS.activeSession)).toBeNull()
  })
})

describe('data it must not touch', () => {
  it.each(['newer', 'failed', 'unavailable'] as const)(
    'does nothing when the saved data is %s',
    (schema) => {
      put(STORAGE_KEYS.attempts, 'looks broken to this version')
      put(STORAGE_KEYS.settings, 'so does this')

      expect(repairStoredData(schema)).toEqual([])
      expect(raw(STORAGE_KEYS.attempts)).toBe('looks broken to this version')
      expect(raw(STORAGE_KEYS.settings)).toBe('so does this')
    },
  )

  it.each(['fresh', 'current', 'migrated'] as const)(
    'does repair data that is %s',
    (schema) => {
      put(STORAGE_KEYS.attempts, 'broken')
      expect(repairStoredData(schema)).toHaveLength(1)
    },
  )

  it("leaves other sites' and unrelated data alone", () => {
    put('someOtherApp.data', 'keep me')
    put(STORAGE_KEYS.attempts, 'broken')
    repairStoredData('current')
    expect(raw('someOtherApp.data')).toBe('keep me')
  })
})
