import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { activateSurvey, getSurvey, saveSurvey } from '../lib/api'
import { errorMessage } from '../lib/errors'
import type { DraftQuestion, QuestionType } from '../lib/types'
import { ConfirmDialog, ErrorBanner, Loading } from '../components/ui'

const newKey = () => crypto.randomUUID()

const newQuestion = (type: QuestionType = 'multiple_choice'): DraftQuestion => ({
  key: newKey(),
  question_text: '',
  question_type: type,
  choices: [
    { key: newKey(), text: '' },
    { key: newKey(), text: '' },
  ],
})

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const copy = [...list]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}

interface FieldErrors {
  title?: string
  questions: Record<string, string>
  choices: Record<string, string>
  general?: string
}

function validate(title: string, questions: DraftQuestion[]): FieldErrors {
  const errs: FieldErrors = { questions: {}, choices: {} }
  if (!title.trim()) errs.title = 'Please enter a survey title.'
  if (questions.length === 0) errs.general = 'Add at least one question.'
  for (const q of questions) {
    if (!q.question_text.trim()) errs.questions[q.key] = 'Enter the question text.'
    if (q.question_type === 'multiple_choice') {
      if (q.choices.length < 2) errs.questions[q.key] ??= 'Add at least two choices.'
      for (const c of q.choices) if (!c.text.trim()) errs.choices[c.key] = 'Enter the choice text.'
    }
  }
  return errs
}

const hasErrors = (e: FieldErrors) =>
  Boolean(e.title || e.general || Object.keys(e.questions).length || Object.keys(e.choices).length)

export default function SurveyEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(Boolean(id))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [surveyId, setSurveyId] = useState<string | null>(id ?? null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()])
  const [errors, setErrors] = useState<FieldErrors>({ questions: {}, choices: {} })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getSurvey(id)
      .then((s) => {
        if (cancelled) return
        if (s.status !== 'draft') {
          setLoadError(
            'Only draft surveys can be edited. Duplicate this survey from the dashboard to make changes.',
          )
          return
        }
        setTitle(s.title)
        setDescription(s.description ?? '')
        setQuestions(
          s.questions.length
            ? s.questions.map((q) => ({
                key: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                choices:
                  q.question_type === 'true_false'
                    ? newQuestion('true_false').choices
                    : q.choices.map((c) => ({ key: c.id, text: c.choice_text })),
              }))
            : [newQuestion()],
        )
      })
      .catch((e) => !cancelled && setLoadError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const touch = () => setSaveState('idle')

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    touch()
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  const updateChoice = (qKey: string, cKey: string, text: string) => {
    touch()
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? { ...q, choices: q.choices.map((c) => (c.key === cKey ? { ...c, text } : c)) }
          : q,
      ),
    )
  }

  async function persist(): Promise<string | null> {
    const errs = validate(title, questions)
    setErrors(errs)
    setServerError(null)
    if (hasErrors(errs)) {
      setServerError('Please fix the highlighted fields.')
      return null
    }
    setSaveState('saving')
    try {
      const savedId = await saveSurvey(surveyId, title, description, questions)
      setSurveyId(savedId)
      setSaveState('saved')
      if (!surveyId) navigate(`/surveys/${savedId}/edit`, { replace: true })
      return savedId
    } catch (e) {
      setSaveState('idle')
      setServerError(errorMessage(e))
      return null
    }
  }

  async function onActivate() {
    const savedId = await persist()
    if (!savedId) return
    setSaveState('saving')
    try {
      await activateSurvey(savedId)
      navigate(`/surveys/${savedId}/present`)
    } catch (e) {
      setSaveState('idle')
      setServerError(errorMessage(e))
    }
  }

  if (loading) return <Loading label="Loading survey..." />
  if (loadError)
    return (
      <div className="space-y-4">
        <ErrorBanner message={loadError} />
        <Link to="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    )

  const busy = saveState === 'saving'

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{surveyId ? 'Edit Survey' : 'New Survey'}</h1>

      <div className="card space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-lg font-semibold">
            Survey Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            maxLength={200}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-err' : undefined}
            onChange={(e) => {
              touch()
              setTitle(e.target.value)
            }}
          />
          {errors.title && (
            <p id="title-err" className="mt-1 font-semibold text-red-800">
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-lg font-semibold">
            Description <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <textarea
            id="description"
            className="input"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => {
              touch()
              setDescription(e.target.value)
            }}
          />
        </div>
      </div>

      {questions.map((q, qi) => (
        <section key={q.key} className="card space-y-4" aria-label={`Question ${qi + 1}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Question {qi + 1}</h2>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                aria-label={`Move question ${qi + 1} up`}
                disabled={qi === 0}
                onClick={() => {
                  touch()
                  setQuestions((qs) => move(qs, qi, -1))
                }}
              >
                ↑
              </button>
              <button
                className="btn-secondary"
                aria-label={`Move question ${qi + 1} down`}
                disabled={qi === questions.length - 1}
                onClick={() => {
                  touch()
                  setQuestions((qs) => move(qs, qi, 1))
                }}
              >
                ↓
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={`q-${q.key}`} className="mb-1 block font-semibold">
              Question text
            </label>
            <input
              id={`q-${q.key}`}
              className="input"
              value={q.question_text}
              aria-invalid={Boolean(errors.questions[q.key])}
              aria-describedby={errors.questions[q.key] ? `q-err-${q.key}` : undefined}
              onChange={(e) => updateQuestion(q.key, { question_text: e.target.value })}
            />
            {errors.questions[q.key] && (
              <p id={`q-err-${q.key}`} className="mt-1 font-semibold text-red-800">
                {errors.questions[q.key]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`t-${q.key}`} className="mb-1 block font-semibold">
              Type
            </label>
            <select
              id={`t-${q.key}`}
              className="input sm:max-w-xs"
              value={q.question_type}
              onChange={(e) =>
                updateQuestion(q.key, { question_type: e.target.value as QuestionType })
              }
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
            </select>
          </div>

          {q.question_type === 'true_false' ? (
            <p className="text-slate-700">Students choose between “True” and “False”.</p>
          ) : (
            <fieldset className="space-y-3">
              <legend className="mb-1 font-semibold">Choices</legend>
              {q.choices.map((c, ci) => (
                <div key={c.key}>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      aria-label={`Question ${qi + 1} choice ${ci + 1}`}
                      value={c.text}
                      aria-invalid={Boolean(errors.choices[c.key])}
                      onChange={(e) => updateChoice(q.key, c.key, e.target.value)}
                    />
                    <button
                      className="btn-secondary"
                      aria-label={`Move choice ${ci + 1} up`}
                      disabled={ci === 0}
                      onClick={() => updateQuestion(q.key, { choices: move(q.choices, ci, -1) })}
                    >
                      ↑
                    </button>
                    <button
                      className="btn-secondary"
                      aria-label={`Move choice ${ci + 1} down`}
                      disabled={ci === q.choices.length - 1}
                      onClick={() => updateQuestion(q.key, { choices: move(q.choices, ci, 1) })}
                    >
                      ↓
                    </button>
                    <button
                      className="btn-secondary text-red-800"
                      aria-label={`Delete choice ${ci + 1}`}
                      disabled={q.choices.length <= 2}
                      onClick={() =>
                        updateQuestion(q.key, {
                          choices: q.choices.filter((x) => x.key !== c.key),
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                  {errors.choices[c.key] && (
                    <p className="mt-1 font-semibold text-red-800">{errors.choices[c.key]}</p>
                  )}
                </div>
              ))}
              <button
                className="btn-secondary"
                onClick={() =>
                  updateQuestion(q.key, { choices: [...q.choices, { key: newKey(), text: '' }] })
                }
              >
                + Add Choice
              </button>
            </fieldset>
          )}

          <button
            className="btn-secondary text-red-800"
            disabled={questions.length === 1}
            onClick={() => setToDelete(q.key)}
          >
            Delete Question
          </button>
        </section>
      ))}

      <button
        className="btn-secondary"
        onClick={() => {
          touch()
          setQuestions((qs) => [...qs, newQuestion()])
        }}
      >
        + Add Question
      </button>

      {errors.general && <p className="font-semibold text-red-800">{errors.general}</p>}
      {serverError && <ErrorBanner message={serverError} />}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-300 pt-4">
        <button className="btn-secondary" disabled={busy} onClick={persist}>
          {busy ? 'Saving...' : 'Save Draft'}
        </button>
        <button className="btn-primary" disabled={busy} onClick={onActivate}>
          Save &amp; Activate
        </button>
        <Link to="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
        <span role="status" className="text-slate-700">
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : ''}
        </span>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this question?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          touch()
          setQuestions((qs) => qs.filter((q) => q.key !== toDelete))
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      >
        <p>The question and its choices will be removed from this draft.</p>
      </ConfirmDialog>
    </div>
  )
}
