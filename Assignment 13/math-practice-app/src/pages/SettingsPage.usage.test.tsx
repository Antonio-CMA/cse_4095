import { render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { saveSettings, DEFAULT_SETTINGS } from '../services/settingsService'
import { STORAGE_KEYS, writeItem } from '../services/storageService'
import { TestRouter } from '../test/TestRouter'
import { SettingsPage } from './SettingsPage'

function renderSettings() {
  return render(
    <AppProvider>
      <TestRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </TestRouter>
    </AppProvider>,
  )
}

describe('how much room the saved data takes', () => {
  it('is shown with the other information about the data', () => {
    saveSettings(DEFAULT_SETTINGS)
    renderSettings()
    expect(
      screen.getByText(/Saved on this device: about \d+ bytes\./),
    ).toBeVisible()
    expect(screen.getByText(/usually allow around 5 MB/)).toBeVisible()
  })

  it('grows into kilobytes as practice builds up', () => {
    writeItem(
      STORAGE_KEYS.attempts,
      Array.from({ length: 1000 }, (_, i) => ({
        id: `attempt-${i}`,
        pad: 'x'.repeat(300),
      })),
    )
    renderSettings()
    expect(screen.getByText(/about \d+ KB\./)).toBeVisible()
  })

  it('is left out, not wrong, when the browser will not say', () => {
    saveSettings(DEFAULT_SETTINGS)
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })
    renderSettings()
    expect(screen.queryByText(/Saved on this device/)).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    ).toBeInTheDocument()
  })
})
