import { createContext } from 'react'
import type { WriteResult } from '../services/storageService'
import type { AppSettings } from '../types/settings'

export interface SettingsContextValue {
  settings: AppSettings
  /**
   * Changes some settings and saves them. The change applies straight away
   * even if saving fails; the result says whether it was saved.
   */
  updateSettings: (changes: Partial<AppSettings>) => WriteResult
  /** Puts every setting back to its default and saves that. */
  resetSettings: () => WriteResult
  /**
   * Erases everything the app has saved (settings, practice history,
   * statistics, mistakes) and goes back to the defaults. Returns false if the
   * browser would not let the data be removed.
   */
  clearAllData: () => boolean
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
