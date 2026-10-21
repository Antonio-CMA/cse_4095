import { hasAppData, readItem, STORAGE_KEYS, writeItem } from './storageService'

/** Bump this when the shape of saved data changes, and add a migration. */
export const CURRENT_SCHEMA_VERSION = 1

/** Moves saved data from one schema version to the next. */
export interface Migration {
  from: number
  to: number
  migrate: () => void
}

/**
 * Every step needed to bring old data up to date, oldest first. A migration
 * must only touch this app's own keys, and must cope with data that is
 * missing or damaged.
 */
export const MIGRATIONS: Migration[] = [
  {
    // Data saved before versioning existed already has the version 1 shape,
    // so adopting it only needs the version number to be written down.
    from: 0,
    to: 1,
    migrate: () => {},
  },
]

export type SchemaStatus =
  /** Nothing saved yet; the current version was recorded. */
  | 'fresh'
  /** Saved data was already up to date. */
  | 'current'
  /** Older saved data was brought up to date. */
  | 'migrated'
  /** Saved by a newer version of the app; left exactly as it is. */
  | 'newer'
  /** A migration failed or is missing; the version was not advanced. */
  | 'failed'
  /** The browser does not allow storage. */
  | 'unavailable'

function parseVersion(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null
  const { version } = value as { version?: unknown }
  return Number.isInteger(version) && (version as number) >= 0
    ? (version as number)
    : null
}

/**
 * Makes sure the saved data matches the version of the app that is running,
 * upgrading it if needed. Safe to call every time the app starts.
 */
export function ensureSchema(
  migrations: Migration[] = MIGRATIONS,
  target: number = CURRENT_SCHEMA_VERSION,
): SchemaStatus {
  const stored = readItem(STORAGE_KEYS.version, parseVersion)

  let version: number
  switch (stored.status) {
    case 'unavailable':
      return 'unavailable'
    case 'ok':
      version = stored.value
      break
    case 'empty':
      if (!hasAppData()) {
        const written = writeItem(STORAGE_KEYS.version, { version: target })
        return written.ok ? 'fresh' : 'unavailable'
      }
      // Data exists from before versions were recorded.
      version = 0
      break
    case 'invalid':
      // A damaged version number: treat the data as the oldest kind.
      version = 0
      break
  }

  if (version > target) return 'newer'
  if (version === target) return 'current'

  while (version < target) {
    const step = migrations.find((m) => m.from === version)
    // A missing step, or one that does not move forward, would never finish.
    if (!step || step.to <= version) return 'failed'
    try {
      step.migrate()
    } catch {
      return 'failed'
    }
    // Record progress after each step so a later failure keeps what worked.
    if (!writeItem(STORAGE_KEYS.version, { version: step.to }).ok) {
      return 'failed'
    }
    version = step.to
  }
  return 'migrated'
}
