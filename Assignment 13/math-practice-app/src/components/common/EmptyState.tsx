import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message: string
  /** An optional button or link to get started. */
  children?: ReactNode
}

/** A friendly "nothing here yet" panel. */
export function EmptyState({ title, message, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__message">{message}</p>
      {children}
    </div>
  )
}
