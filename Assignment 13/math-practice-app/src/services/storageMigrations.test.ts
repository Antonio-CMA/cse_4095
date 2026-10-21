import { describe, expect, it, vi } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  ensureSchema,
  MIGRATIONS,
  type Migration,
} from './storageMigrations'
import { readItem, STORAGE_KEYS, writeItem } from './storageService'

const storedVersion = () =>
  window.localStorage.getItem(STORAGE_KEYS.version) === null
    ? null
    : JSON.parse(window.localStorage.getItem(STORAGE_KEYS.version) as string)

describe('the built-in migrations', () => {
  it('start at version 0 and reach the current version without gaps', () => {
    let version = 0
    for (const step of MIGRATIONS) {
      expect(step.from).toBe(version)
      expect(step.to).toBeGreaterThan(step.from)
      version = step.to
    }
    expect(version).toBe(CURRENT_SCHEMA_VERSION)
  })
})

describe('ensureSchema', () => {
  it('records the current version when nothing has been saved', () => {
    expect(ensureSchema()).toBe('fresh')
    expect(storedVersion()).toEqual({ version: CURRENT_SCHEMA_VERSION })
  })

  it('stores the version in the shape the specification shows', () => {
    ensureSchema()
    expect(window.localStorage.getItem('mathPractice.version')).toBe(
      `{"version":${CURRENT_SCHEMA_VERSION}}`,
    )
  })

  it('does nothing when the data is already current', () => {
    writeItem(STORAGE_KEYS.version, { version: CURRENT_SCHEMA_VERSION })
    writeItem(STORAGE_KEYS.settings, { soundEnabled: false })
    const migrate = vi.fn()

    expect(ensureSchema([{ from: 0, to: 1, migrate }])).toBe('current')
    expect(migrate).not.toHaveBeenCalled()
  })

  it('adopts unversioned data saved before versions existed', () => {
    writeItem(STORAGE_KEYS.settings, { soundEnabled: false })

    expect(ensureSchema()).toBe('migrated')
    expect(storedVersion()).toEqual({ version: CURRENT_SCHEMA_VERSION })
    expect(readItem(STORAGE_KEYS.settings, (v) => v as object)).toEqual({
      status: 'ok',
      value: { soundEnabled: false },
    })
  })

  it('treats a damaged version number as the oldest version', () => {
    writeItem(STORAGE_KEYS.settings, {})
    window.localStorage.setItem(STORAGE_KEYS.version, 'garbage')
    expect(ensureSchema()).toBe('migrated')
    expect(storedVersion()).toEqual({ version: CURRENT_SCHEMA_VERSION })
  })

  it.each([[{ version: -1 }], [{ version: 1.5 }], [{ version: '1' }], [{}]])(
    'treats the version value %j as damaged',
    (value) => {
      writeItem(STORAGE_KEYS.settings, {})
      writeItem(STORAGE_KEYS.version, value)
      expect(ensureSchema()).toBe('migrated')
    },
  )

  it('runs every step from the saved version up to the target, in order', () => {
    const calls: string[] = []
    const migrations: Migration[] = [
      { from: 1, to: 2, migrate: () => calls.push('1→2') },
      { from: 2, to: 3, migrate: () => calls.push('2→3') },
      { from: 3, to: 4, migrate: () => calls.push('3→4') },
    ]
    writeItem(STORAGE_KEYS.version, { version: 1 })

    expect(ensureSchema(migrations, 4)).toBe('migrated')
    expect(calls).toEqual(['1→2', '2→3', '3→4'])
    expect(storedVersion()).toEqual({ version: 4 })
  })

  it('skips steps the data has already passed', () => {
    const calls: string[] = []
    const migrations: Migration[] = [
      { from: 1, to: 2, migrate: () => calls.push('1→2') },
      { from: 2, to: 3, migrate: () => calls.push('2→3') },
    ]
    writeItem(STORAGE_KEYS.version, { version: 2 })

    expect(ensureSchema(migrations, 3)).toBe('migrated')
    expect(calls).toEqual(['2→3'])
  })

  it('lets a migration change the app’s saved data', () => {
    writeItem(STORAGE_KEYS.version, { version: 1 })
    writeItem(STORAGE_KEYS.settings, { old: true })
    const migrations: Migration[] = [
      {
        from: 1,
        to: 2,
        migrate: () => writeItem(STORAGE_KEYS.settings, { upgraded: true }),
      },
    ]

    ensureSchema(migrations, 2)
    expect(readItem(STORAGE_KEYS.settings, (v) => v as object)).toEqual({
      status: 'ok',
      value: { upgraded: true },
    })
  })

  it('keeps the progress made if a later step fails', () => {
    const migrations: Migration[] = [
      { from: 1, to: 2, migrate: () => {} },
      {
        from: 2,
        to: 3,
        migrate: () => {
          throw new Error('broken')
        },
      },
    ]
    writeItem(STORAGE_KEYS.version, { version: 1 })

    expect(ensureSchema(migrations, 3)).toBe('failed')
    expect(storedVersion()).toEqual({ version: 2 })
  })

  it('fails safely, without advancing, if a step is missing', () => {
    writeItem(STORAGE_KEYS.version, { version: 1 })
    expect(ensureSchema([], 3)).toBe('failed')
    expect(storedVersion()).toEqual({ version: 1 })
  })

  it('fails instead of looping forever on a step that goes nowhere', () => {
    writeItem(STORAGE_KEYS.version, { version: 1 })
    expect(ensureSchema([{ from: 1, to: 1, migrate: () => {} }], 2)).toBe(
      'failed',
    )
  })

  it('leaves data from a newer version of the app untouched', () => {
    writeItem(STORAGE_KEYS.version, { version: CURRENT_SCHEMA_VERSION + 5 })
    writeItem(STORAGE_KEYS.settings, { future: true })

    expect(ensureSchema()).toBe('newer')
    expect(storedVersion()).toEqual({ version: CURRENT_SCHEMA_VERSION + 5 })
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).toBe(
      '{"future":true}',
    )
  })

  it('never touches keys that do not belong to the app', () => {
    window.localStorage.setItem('someOtherApp.data', 'keep me')
    writeItem(STORAGE_KEYS.settings, {})

    ensureSchema()
    expect(window.localStorage.getItem('someOtherApp.data')).toBe('keep me')
  })

  it('reports "unavailable" when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(ensureSchema()).toBe('unavailable')
  })

  it('reports "unavailable" when the version cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(ensureSchema()).toBe('unavailable')
  })

  it('is safe to call again', () => {
    expect(ensureSchema()).toBe('fresh')
    expect(ensureSchema()).toBe('current')
    expect(ensureSchema()).toBe('current')
  })
})
