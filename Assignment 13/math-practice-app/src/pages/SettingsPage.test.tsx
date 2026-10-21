import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { saveSession } from '../services/practiceHistory'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../services/settingsService'
import { recordAttempt } from '../services/statisticsService'
import { STORAGE_KEYS } from '../services/storageService'
import { makeAttempt, makeResult } from '../test/sessionResult'
import { SettingsPage } from './SettingsPage'

function renderPage() {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

const saved = () => loadSettings().settings

describe('SettingsPage contents', () => {
  it('shows every setting from the specification', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Card animation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Show explanations' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Encouraging messages' }),
    ).toBeChecked()
    expect(
      screen.getByRole('group', { name: 'Default session length' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Default level' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Default operations' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', {
        name: 'Right answers needed to master a mistake',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    ).toBeInTheDocument()
  })

  it('starts with the current settings selected', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
      cardAnimationEnabled: false,
      defaultSessionLength: 20,
      defaultDifficulty: 3,
      defaultOperations: ['subtraction', 'division'],
      masteryThreshold: 5,
    })
    renderPage()

    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Card animation' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show explanations' }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(
      screen.getByRole('combobox', { name: /master a mistake/ }),
    ).toHaveValue('5')
  })

  it('explains that sounds are not available yet', () => {
    renderPage()
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).toHaveAccessibleDescription(/aren't added yet/)
  })
})

describe('changing settings', () => {
  it('saves the on/off settings automatically', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    expect(saved().cardAnimationEnabled).toBe(false)

    await user.click(
      screen.getByRole('checkbox', { name: 'Show explanations' }),
    )
    expect(saved().showExplanations).toBe(false)

    await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
    expect(saved().soundEnabled).toBe(false)

    await user.click(
      screen.getByRole('checkbox', { name: 'Encouraging messages' }),
    )
    expect(saved().feedbackEnabled).toBe(false)

    // ...and each can be turned back on.
    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    expect(saved().cardAnimationEnabled).toBe(true)
  })

  it('saves the default session length, level and operations', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
    await user.click(screen.getByRole('radio', { name: 'Advanced' }))
    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))

    expect(saved()).toMatchObject({
      defaultSessionLength: 'continuous',
      defaultDifficulty: 4,
      defaultOperations: ['addition', 'multiplication'],
    })
  })

  it('allows no default operations at all', async () => {
    const user = userEvent.setup()
    saveSettings({ ...DEFAULT_SETTINGS, defaultOperations: ['addition'] })
    renderPage()

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(saved().defaultOperations).toEqual([])
  })

  it('saves the mastery threshold', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /master a mistake/ }),
      '4',
    )
    expect(saved().masteryThreshold).toBe(4)
  })

  it('offers mastery thresholds from 1 to 20', () => {
    renderPage()
    const options = within(
      screen.getByRole('combobox', { name: /master a mistake/ }),
    ).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1)),
    )
  })

  it('keeps the other settings when one changes', async () => {
    const user = userEvent.setup()
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 2 })
    renderPage()

    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    expect(saved()).toMatchObject({
      defaultDifficulty: 2,
      cardAnimationEnabled: false,
    })
  })

  it('tells the student their settings are saved', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('')

    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your settings are saved.',
    )
  })

  it('says so, but still applies the change, if it cannot be saved', async () => {
    const user = userEvent.setup()
    renderPage()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      "We couldn't save your settings",
    )
    expect(
      screen.getByRole('checkbox', { name: 'Card animation' }),
    ).not.toBeChecked()
  })
})

describe('restoring the default settings', () => {
  it('puts every setting back and saves that', async () => {
    const user = userEvent.setup()
    saveSettings({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
      defaultDifficulty: 4,
      defaultSessionLength: 'continuous',
      defaultOperations: ['division'],
      masteryThreshold: 9,
    })
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Restore Default Settings' }),
    )

    expect(saved()).toEqual(DEFAULT_SETTINGS)
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
    expect(
      screen.getByRole('combobox', { name: /master a mistake/ }),
    ).toHaveValue('3')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your settings are saved.',
    )
  })

  it('does not touch practice history', async () => {
    const user = userEvent.setup()
    recordAttempt(makeAttempt())
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Restore Default Settings' }),
    )
    expect(window.localStorage.getItem(STORAGE_KEYS.attempts)).not.toBeNull()
  })
})

describe('clearing all application data', () => {
  function fillWithData() {
    saveSettings({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
      defaultDifficulty: 3,
    })
    saveSession(makeResult([true, false]).session)
    recordAttempt(makeAttempt())
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, '[]')
    window.localStorage.setItem('someOtherApp.data', 'keep me')
  }

  it('asks first with a strong warning, and does nothing yet', async () => {
    fillWithData()
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )

    const dialog = screen.getByRole('alertdialog', {
      name: 'Delete everything?',
    })
    expect(dialog).toHaveAccessibleDescription(
      /permanently deletes your settings, practice history, statistics and saved mistakes/,
    )
    expect(dialog).toHaveAccessibleDescription(/can't be undone/)
    expect(
      within(dialog).getByRole('button', { name: 'Keep My Data' }),
    ).toHaveFocus()
    expect(window.localStorage.getItem(STORAGE_KEYS.attempts)).not.toBeNull()
    expect(saved().soundEnabled).toBe(false)
  })

  it('keeps everything if the student backs out', async () => {
    fillWithData()
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(screen.getByRole('button', { name: 'Keep My Data' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.sessions)).not.toBeNull()
  })

  it('erases the app data, restores the defaults and returns home', async () => {
    fillWithData()
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Yes, Delete Everything' }),
    )

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    for (const key of [
      STORAGE_KEYS.settings,
      STORAGE_KEYS.sessions,
      STORAGE_KEYS.attempts,
      STORAGE_KEYS.statistics,
      STORAGE_KEYS.mistakePatterns,
    ]) {
      expect(window.localStorage.getItem(key)).toBeNull()
    }
    // Defaults are back in use, and unrelated data is untouched.
    expect(saved()).toEqual(DEFAULT_SETTINGS)
    expect(window.localStorage.getItem('someOtherApp.data')).toBe('keep me')
  })

  it('records the version again so the app starts cleanly', async () => {
    fillWithData()
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Yes, Delete Everything' }),
    )

    expect(window.localStorage.getItem(STORAGE_KEYS.version)).toBe(
      '{"version":1}',
    )
  })

  it('stays on the page and says so if the browser would not erase everything', async () => {
    fillWithData()
    const user = userEvent.setup()
    renderPage()
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Yes, Delete Everything' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't erase everything",
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
