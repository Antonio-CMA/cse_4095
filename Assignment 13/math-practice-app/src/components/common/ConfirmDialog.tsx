import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * An in-page "are you sure?" panel. Focus starts on the cancel button so a
 * stray Enter press never confirms by accident, and Escape cancels.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onCancel()
  }

  return (
    <div
      className="confirm"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onKeyDown={handleKeyDown}
    >
      <h2 id={titleId} className="confirm__title">
        {title}
      </h2>
      <p id={messageId} className="confirm__message">
        {message}
      </p>
      <div className="confirm__actions">
        <Button ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="secondary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
