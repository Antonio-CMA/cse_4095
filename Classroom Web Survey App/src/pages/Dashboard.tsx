import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  activateSurvey,
  closeSurvey,
  deleteSurvey,
  duplicateSurvey,
  listSurveys,
  setSurveyStatus,
  type SurveyListItem,
} from '../lib/api'
import { errorMessage } from '../lib/errors'
import type { SurveyStatus } from '../lib/types'
import { ConfirmDialog, ErrorBanner, Loading, StatusBadge } from '../components/ui'

type Pending = { kind: 'delete' | 'archive' | 'close' | 'activate'; survey: SurveyListItem } | null

export default function Dashboard() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SurveyListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setSurveys(await listSurveys())
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const active = surveys?.find((s) => s.status === 'active')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : null
    const to = toDate ? new Date(toDate + 'T23:59:59').getTime() : null
    return (surveys ?? []).filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      const t = new Date(s.created_at).getTime()
      if (from !== null && t < from) return false
      if (to !== null && t > to) return false
      return true
    })
  }, [surveys, search, statusFilter, fromDate, toDate])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      setPending(null)
      await load()
    } catch (e) {
      setPending(null)
      setActionError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function onDuplicate(s: SurveyListItem) {
    setActionError(null)
    try {
      const id = await duplicateSurvey(s.id)
      navigate(`/surveys/${id}/edit`)
    } catch (e) {
      setActionError(errorMessage(e))
    }
  }

  function confirmAction() {
    if (!pending) return
    const { kind, survey } = pending
    void run(async () => {
      if (kind === 'delete') await deleteSurvey(survey.id)
      else if (kind === 'archive') await setSurveyStatus(survey.id, 'archived')
      else if (kind === 'close') await closeSurvey(survey.id)
      else {
        await activateSurvey(survey.id)
        navigate(`/surveys/${survey.id}/present`)
      }
    })
  }

  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!surveys) return <Loading label="Loading surveys..." />

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {actionError && <ErrorBanner message={actionError} />}

      {surveys.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="mb-5 text-xl">You have not created any surveys yet.</p>
          <Link to="/surveys/new" className="btn-primary">
            Create Your First Survey
          </Link>
        </div>
      ) : (
        <>
          <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="search" className="mb-1 block font-semibold">
                Search
              </label>
              <input
                id="search"
                type="search"
                className="input"
                placeholder="Survey title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block font-semibold">
                Status
              </label>
              <select
                id="status"
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SurveyStatus | 'all')}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="from" className="mb-1 block font-semibold">
                Created from
              </label>
              <input
                id="from"
                type="date"
                className="input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="to" className="mb-1 block font-semibold">
                Created to
              </label>
              <input
                id="to"
                type="date"
                className="input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="card text-center text-lg">No surveys match your search.</p>
          ) : (
            <ul className="space-y-4">
              {filtered.map((s) => (
                <li key={s.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold">{s.title}</h2>
                      <p className="mt-1 text-slate-700">
                        Created{' '}
                        {new Date(s.created_at).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })}{' '}
                        · {s.response_count} {s.response_count === 1 ? 'response' : 'responses'}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.status === 'draft' && (
                      <Link to={`/surveys/${s.id}/edit`} className="btn-secondary">
                        Edit
                      </Link>
                    )}
                    {(s.status === 'draft' || s.status === 'closed') && (
                      <button
                        className="btn-primary"
                        onClick={() => setPending({ kind: 'activate', survey: s })}
                      >
                        Activate
                      </button>
                    )}
                    {s.status === 'active' && (
                      <>
                        <Link to={`/surveys/${s.id}/present`} className="btn-primary">
                          Present
                        </Link>
                        <button
                          className="btn-secondary"
                          onClick={() => setPending({ kind: 'close', survey: s })}
                        >
                          Close
                        </button>
                      </>
                    )}
                    {s.status !== 'draft' && (
                      <Link to={`/surveys/${s.id}/results`} className="btn-secondary">
                        Results
                      </Link>
                    )}
                    <button className="btn-secondary" onClick={() => onDuplicate(s)}>
                      Duplicate
                    </button>
                    {s.status !== 'archived' && s.status !== 'active' && (
                      <button
                        className="btn-secondary"
                        onClick={() => setPending({ kind: 'archive', survey: s })}
                      >
                        Archive
                      </button>
                    )}
                    {s.status !== 'active' && (
                      <button
                        className="btn-secondary text-red-800"
                        onClick={() => setPending({ kind: 'delete', survey: s })}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title={`Delete "${pending?.survey.title ?? ''}"?`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      >
        <p>This will permanently delete the survey and all of its responses.</p>
        {pending && pending.survey.response_count > 0 && (
          <p className="font-bold text-red-800">
            Warning: this survey has {pending.survey.response_count} recorded{' '}
            {pending.survey.response_count === 1 ? 'response' : 'responses'} that will be lost.
            Consider archiving it instead.
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === 'archive'}
        title={`Archive "${pending?.survey.title ?? ''}"?`}
        confirmLabel="Archive"
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      >
        <p>Archived surveys keep their results but can no longer be activated or edited.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === 'close'}
        title={`Close "${pending?.survey.title ?? ''}"?`}
        confirmLabel="Close Survey"
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      >
        <p>Students will no longer be able to submit responses.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === 'activate'}
        title={`Activate "${pending?.survey.title ?? ''}"?`}
        confirmLabel="Activate"
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      >
        <p>Students will be able to answer this survey using its QR code.</p>
        {active && pending && active.id !== pending.survey.id && (
          <p className="font-semibold">
            Only one survey can be active, so "{active.title}" will be closed.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
