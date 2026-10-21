import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSettings } from '../hooks/useSettings'
import { DEFAULT_SETTINGS, loadSettings } from '../services/settingsService'
import { STORAGE_KEYS } from '../services/storageService'
import { AppProvider } from './AppProvider'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)

describe('AppProvider', () => {
  it('starts with the defaults when nothing is saved', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('loads the saved settings when the app starts', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        soundEnabled: false,
        masteryThreshold: 7,
      }),
    )
    const { result } = renderHook(() => useSettings(), { wrapper })

    expect(result.current.settings.soundEnabled).toBe(false)
    expect(result.current.settings.masteryThreshold).toBe(7)
  })

  it('falls back to defaults if the saved settings are damaged', () => {
    window.localStorage.setItem(STORAGE_KEYS.settings, '{{ not json')
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('saves a change straight away and keeps the other settings', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    act(() => result.current.updateSettings({ cardAnimationEnabled: false }))

    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      cardAnimationEnabled: false,
    })
    expect(loadSettings().settings.cardAnimationEnabled).toBe(false)
  })

  it('combines several changes over time', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    act(() => result.current.updateSettings({ soundEnabled: false }))
    act(() => result.current.updateSettings({ defaultDifficulty: 3 }))

    expect(loadSettings().settings).toMatchObject({
      soundEnabled: false,
      defaultDifficulty: 3,
    })
  })

  it('ignores invalid values instead of saving them', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    act(() => result.current.updateSettings({ defaultDifficulty: 99 as never }))
    expect(result.current.settings.defaultDifficulty).toBe(
      DEFAULT_SETTINGS.defaultDifficulty,
    )
  })

  it('restores the defaults and saves them', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => result.current.updateSettings({ soundEnabled: false }))

    act(() => result.current.resetSettings())

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('still applies a change for this visit if it cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useSettings(), { wrapper })

    act(() => result.current.updateSettings({ soundEnabled: false }))
    expect(result.current.settings.soundEnabled).toBe(false)
  })

  it('shows its children', () => {
    render(
      <AppProvider>
        <p>hello</p>
      </AppProvider>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})

describe('AppProvider results', () => {
  it('reports whether a change was saved', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    let saved
    act(() => {
      saved = result.current.updateSettings({ soundEnabled: false })
    })
    expect(saved).toEqual({ ok: true })
  })

  it('reports a failed save, and still applies the change', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { result } = renderHook(() => useSettings(), { wrapper })

    let saved
    act(() => {
      saved = result.current.updateSettings({ soundEnabled: false })
    })
    expect(saved).toEqual({ ok: false, reason: 'unavailable' })
    expect(result.current.settings.soundEnabled).toBe(false)
  })

  it('reports whether the defaults were restored and saved', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })

    let saved
    act(() => {
      saved = result.current.resetSettings()
    })
    expect(saved).toEqual({ ok: true })
  })
})

describe('AppProvider clearAllData', () => {
  it('erases the app’s data and goes back to the defaults', () => {
    window.localStorage.setItem(STORAGE_KEYS.attempts, '[]')
    window.localStorage.setItem('someOtherApp.data', 'keep me')
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.updateSettings({ soundEnabled: false })
    })

    let cleared
    act(() => {
      cleared = result.current.clearAllData()
    })

    expect(cleared).toBe(true)
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEYS.attempts)).toBeNull()
    expect(window.localStorage.getItem('someOtherApp.data')).toBe('keep me')
  })

  it('records the schema version again', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.clearAllData()
    })
    expect(window.localStorage.getItem(STORAGE_KEYS.version)).toBe(
      '{"version":1}',
    )
  })

  it('keeps the current settings if the browser would not erase the data', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => {
      result.current.updateSettings({ soundEnabled: false })
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    let cleared
    act(() => {
      cleared = result.current.clearAllData()
    })

    expect(cleared).toBe(false)
    expect(result.current.settings.soundEnabled).toBe(false)
  })
})

describe('useSettings', () => {
  it('explains the problem if used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useSettings())).toThrow(
      'useSettings must be used inside AppProvider',
    )
  })
})
