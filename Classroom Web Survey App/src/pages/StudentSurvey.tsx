import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicSurvey, submitResponse, type PublicSurveyResult } from '../lib/api'
import { toAppError } from '../lib/errors'
import { getAnonymousToken, hasSubmitted, markSubmitted } from '../lib/token'
import { Loading } from '../components/ui'

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children && <p className="text-xl text-slate-700">{children}</p>}
    </main>
  )
}

export default function StudentSurvey() {
  const { slug = '' } = useParams()
  const [result, setResult] = useState<PublicSurveyResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState<'success' | 'duplicate' | null>(null)

  useEffect(() => {
    let cancelled = false
    getPublicSurvey(slug)
      .then((r) => {
        if (cancelled) return
        setResult(r)
        if (r.kind === 'active' && hasSubmitted(r.survey.id)) setDone('duplicate')
      })
      .catch((e) => !cancelled && setLoadError(toAppError(e).message))
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loadError)
    return (
      <Message title="Something went wrong">
        {loadError}{' '}
        <button className="btn-primary mt-4" onClick={() => window.location.reload()}>
          Reload
        </button>
      </Message>
    )
  if (!result) return <Loading label="Loading survey..." />
  if (result.kind === 'not_found') return <Message title="Survey not found." />
  if (result.kind === 'closed')
    return <Message title="This survey is no longer accepting responses." />
  if (done === 'success')
    return <Message title="Thank you!">Your response has been recorded.</Message>
  if (done === 'duplicate')
    return (
      <Message title="Already submitted">
        You have already submitted a response to this survey.
      </Message>
    )

  const { survey } = result

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const unanswered = survey.questions.filter((q) => !selected[q.id]).map((q) => q.id)
    setMissing(new Set(unanswered))
    if (unanswered.length) {
      setSubmitError('Please answer every question before submitting.')
      document.getElementById(`q-${unanswered[0]}`)?.scrollIntoView({ block: 'center' })
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      await submitResponse(
        survey.id,
        getAnonymousToken(),
        survey.questions.map((q) => ({ question_id: q.id, choice_id: selected[q.id] })),
      )
      markSubmitted(survey.id)
      setDone('success')
    } catch (err) {
      const appErr = toAppError(err)
      if (appErr.code === 'DUPLICATE_RESPONSE') {
        markSubmitted(survey.id)
        setDone('duplicate')
      } else if (appErr.code === 'SURVEY_NOT_ACTIVE') {
        setResult({ kind: 'closed' })
      } else {
        setSubmitError(appErr.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold">{survey.title}</h1>
          {survey.description && (
            <p className="mt-2 text-lg text-slate-700">{survey.description}</p>
          )}
        </header>

        {survey.questions.map((q, qi) => (
          <fieldset key={q.id} id={`q-${q.id}`} className="space-y-3">
            <legend className="mb-2 text-xl font-semibold">
              {qi + 1}. {q.question_text}
            </legend>
            {q.choices.map((c) => {
              const checked = selected[q.id] === c.id
              return (
                <label
                  key={c.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-lg ${
                    checked
                      ? 'border-blue-700 bg-blue-50 font-semibold'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={c.id}
                    checked={checked}
                    className="h-6 w-6 shrink-0 accent-blue-700"
                    onChange={() => {
                      setSelected((s) => ({ ...s, [q.id]: c.id }))
                      setMissing((m) => {
                        const n = new Set(m)
                        n.delete(q.id)
                        return n
                      })
                    }}
                  />
                  <span>{c.choice_text}</span>
                </label>
              )
            })}
            {missing.has(q.id) && (
              <p role="alert" className="font-semibold text-red-800">
                Please choose an answer.
              </p>
            )}
          </fieldset>
        ))}

        {submitError && (
          <p
            role="alert"
            className="rounded-lg border border-red-700 bg-red-50 p-3 font-semibold text-red-900"
          >
            {submitError}
          </p>
        )}

        <button type="submit" className="btn-primary min-h-14 w-full text-xl" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </main>
  )
}
