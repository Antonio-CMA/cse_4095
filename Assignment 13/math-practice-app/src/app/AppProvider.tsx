import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  createDefaultSettings,
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from '../services/settingsService'
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
      saveSettings(next)
    },
    [settings],
  )

  const resetSettings = useCallback(() => {
    const next = createDefaultSettings()
    setSettings(next)
    saveSettings(next)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}
