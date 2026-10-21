import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type Listener = () => void

/** A fake matchMedia whose answer can be changed while the test runs. */
function fakeMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<Listener>()
  const query = {
    get matches() {
      return matches
    },
    addEventListener: (_: string, listener: Listener) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) =>
      listeners.delete(listener),
  }
  const matchMedia = vi.fn(() => query)
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia
  return {
    matchMedia,
    listeners,
    set(next: boolean) {
      matches = next
      listeners.forEach((l) => l())
    },
  }
}

const original = window.matchMedia

afterEach(() => {
  window.matchMedia = original
})

describe('usePrefersReducedMotion', () => {
  it('is false when the device has no preference', () => {
    fakeMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('is true when the device asks for less motion', () => {
    fakeMatchMedia(true)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it('asks the browser about reduced motion', () => {
    const fake = fakeMatchMedia(false)
    renderHook(() => usePrefersReducedMotion())
    expect(fake.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    )
  })

  it('updates if the setting changes while the app is open', () => {
    const fake = fakeMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())

    act(() => fake.set(true))
    expect(result.current).toBe(true)

    act(() => fake.set(false))
    expect(result.current).toBe(false)
  })

  it('stops listening when the component goes away', () => {
    const fake = fakeMatchMedia(false)
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    expect(fake.listeners.size).toBe(1)

    unmount()
    expect(fake.listeners.size).toBe(0)
  })

  it('is false, not an error, in a browser without matchMedia', () => {
    // @ts-expect-error simulating an environment without matchMedia
    window.matchMedia = undefined
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })
})
