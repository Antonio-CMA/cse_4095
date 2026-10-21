import { useSyncExternalStore } from 'react'
import {
  dismissStorageFailure,
  getStorageFailure,
  subscribeToStorageFailure,
} from '../../services/storageFailures'
import { STORAGE_MESSAGES } from '../../utils/storageMessages'
import { Button } from './Button'

/**
 * Tells the student when the browser would not save something, since their
 * practice would otherwise silently go missing. It can be closed, and then it
 * stays quiet unless a different kind of problem comes up.
 */
export function StorageWarning() {
  const failure = useSyncExternalStore(
    subscribeToStorageFailure,
    getStorageFailure,
  )
  if (!failure || failure.dismissed) return null

  return (
    <div className="app-notice" role="status">
      <p className="app-notice__text">{STORAGE_MESSAGES[failure.reason]}</p>
      <Button variant="secondary" onClick={dismissStorageFailure}>
        Got It
      </Button>
    </div>
  )
}
