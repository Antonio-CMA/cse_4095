import { useContext } from 'react'
import {
  SettingsContext,
  type SettingsContextValue,
} from '../app/settingsContext'

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside AppProvider')
  return value
}
