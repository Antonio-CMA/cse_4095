import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
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

describe('restoring the default settings', () => {
  it('says they are saved when they are', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.click(
      screen.getByRole('button', { name: 'Restore Default Settings' }),
    )
    expect(screen.getByText('Your settings are saved.')).toBeInTheDocument()
  })

  it('says so, in simple words, when the browser will not save them', async () => {
    const user = userEvent.setup()
    renderSettings()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })

    await user.click(
      screen.getByRole('button', { name: 'Restore Default Settings' }),
    )
    expect(
      screen.getByText(/We couldn't save your settings/),
    ).toBeInTheDocument()
  })
})
