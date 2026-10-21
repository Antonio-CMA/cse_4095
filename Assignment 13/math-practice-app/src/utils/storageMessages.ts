import type { WriteFailure } from '../services/storageService'

/** What went wrong with saving, in simple words, and what it means. */
export const STORAGE_MESSAGES: Record<WriteFailure, string> = {
  unavailable:
    "This browser isn't letting us save your progress. Private browsing or blocked site data can cause this. You can keep practicing, but your results and settings may not be remembered.",
  quota:
    "There's no room left on this device to save your progress. You can keep practicing, but new results may not be remembered. Resetting your statistics on the Statistics page can make room.",
  error:
    'Something stopped us from saving your progress. You can keep practicing, but your latest results may not be remembered.',
}
