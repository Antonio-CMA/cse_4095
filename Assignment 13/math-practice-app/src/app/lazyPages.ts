import { lazy } from 'react'

/**
 * Statistics and settings are not needed to start practising, so they are
 * loaded only when first visited (or just after the app has settled, see
 * `preloadSecondaryPages`), which keeps the first download smaller.
 */
const loadStatisticsPage = () =>
  import('../pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage }))
const loadSettingsPage = () =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))

export const StatisticsPage = lazy(loadStatisticsPage)
export const SettingsPage = lazy(loadSettingsPage)

/**
 * Fetches the lazily loaded pages in the background, so that opening them later
 * is instant. A failed fetch is ignored here: opening the page tries again.
 */
export function preloadSecondaryPages(): Promise<unknown> {
  return Promise.allSettled([loadStatisticsPage(), loadSettingsPage()])
}
