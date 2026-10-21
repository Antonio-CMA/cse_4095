import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null
}

function subscribe(onChange: () => void): () => void {
  const query = getMediaQuery()
  if (!query) return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false
}

/**
 * True when the student's device asks for less motion. It updates if they
 * change that setting while the app is open.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
