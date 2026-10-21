import { useEffect } from 'react'

/** True if the key press is going into something the student is typing in. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

interface Options {
  /** Turn the shortcuts off, e.g. once the card is flipped. */
  enabled: boolean
  /** How many answers there are; keys 1 to this number work. */
  count: number
  /** Called with the zero-based position of the chosen answer. */
  onSelect: (index: number) => void
}

/**
 * Lets the number keys 1–4 choose an answer. The keys are left alone when a
 * modifier is held (browser shortcuts such as Ctrl+1) or when the student is
 * typing in a field, so they never get in the way.
 */
export function useAnswerShortcuts({ enabled, count, onSelect }: Options) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      // Only a single digit, "1" up to the number of answers.
      if (!/^[1-9]$/.test(event.key)) return
      const number = Number(event.key)
      if (number > count) return

      event.preventDefault()
      onSelect(number - 1)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, count, onSelect])
}
