import type { WriteFailure } from './storageService'

/**
 * Remembers that the browser would not save something, so the page can tell the
 * student. The storage code reports a failure here, and the warning bar listens.
 *
 * Only the first failure of each kind is announced, and once the student closes
 * the warning the same kind of failure does not bring it back after every
 * answer. A different kind of failure does.
 */

export interface StorageFailureState {
  reason: WriteFailure
  dismissed: boolean
}

let current: StorageFailureState | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function reportStorageFailure(reason: WriteFailure): void {
  if (current?.reason === reason) return
  current = { reason, dismissed: false }
  emit()
}

export function dismissStorageFailure(): void {
  if (!current || current.dismissed) return
  current = { ...current, dismissed: true }
  emit()
}

/** Forgets everything (used between tests). */
export function resetStorageFailure(): void {
  current = null
  emit()
}

export function getStorageFailure(): StorageFailureState | null {
  return current
}

export function subscribeToStorageFailure(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
