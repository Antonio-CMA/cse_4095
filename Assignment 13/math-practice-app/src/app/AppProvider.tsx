import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  createDefaultSettings,
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from '../services/settingsService'
import { ensureSchema } from '../services/storageMigrations'
import { clearAppData } from '../services/storageService'
import type { AppSettings } from '../types/settings'
import { SettingsContext, type SettingsContextValue } from './settingsContext'

/**
 * Loads the saved settings when the app starts (falling back to defaults) and
 * keeps them saved whenever they change. If saving fails, the new settings
 * still apply for this visit.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(
    () => loadSettings().settings,
  )

  const updateSettings = useCallback(
    (changes: Partial<AppSettings>) => {
      const next = sanitizeSettings({ ...settings, ...changes })
      setSettings(next)
      return saveSettings(next)
    },
    [settings],
  )

  const resetSettings = useCallback(() => {
    const next = createDefaultSettings()
    setSettings(next)
    return saveSettings(next)
  }, [])

  const clearAllData = useCallback(() => {
    const cleared = clearAppData()
    if (cleared) {
      // Record the schema version again so the next save starts cleanly. The
      // defaults are used in memory only; nothing is saved until a change.
      ensureSchema()
      setSettings(createDefaultSettings())
    }
    return cleared
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings, clearAllData }),
    [settings, updateSettings, resetSettings, clearAllData],
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}
