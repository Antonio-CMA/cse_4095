import { useEffect, useRef, type ReactNode } from 'react'
import type { SurveyStatus } from '../lib/types'

const STATUS_STYLES: Record<SurveyStatus, string> = {
  draft: 'bg-slate-200 text-slate-900 border-slate-500',
  active: 'bg-green-100 text-green-900 border-green-700',
  closed: 'bg-amber-100 text-amber-900 border-amber-700',
  archived: 'bg-purple-100 text-purple-900 border-purple-700',
}
const STATUS_ICON: Record<SurveyStatus, string> = {
  draft: '✎',
  active: '●',
  closed: '■',
  archived: '▤',
}

/** Status is conveyed by text + icon, not colour alone. */
export function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STATUS_STYLES[status]}`}
    >
      <span aria-hidden="true">{STATUS_ICON[status]}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-lg text-slate-700">
      {label}
    </p>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-700 bg-red-50 p-4 text-red-900"
    >
      <span>{message}</span>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,28rem)] rounded-xl p-6 shadow-xl backdrop:bg-black/50"
    >
      <h2 id="confirm-title" className="text-xl font-bold">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-slate-800">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working...' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export function ConfigMissing() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <div role="alert" className="card border-amber-600 bg-amber-50">
        <h1 className="text-xl font-bold">Supabase is not configured</h1>
        <p className="mt-2">
          Copy <code>.env.example</code> to <code>.env.local</code>, set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the
          dev server. See the README for details.
        </p>
      </div>
    </div>
  )
}
