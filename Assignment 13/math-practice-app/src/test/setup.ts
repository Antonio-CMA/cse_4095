import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetStorageFailure } from '../services/storageFailures'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  // Saved data must never leak from one test into the next.
  window.localStorage.clear()
  resetStorageFailure()
})
