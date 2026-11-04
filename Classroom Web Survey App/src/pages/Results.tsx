import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { fetchExportRows, getResults, getSurvey } from '../lib/api'
import { buildCsv, downloadText, safeFilename } from '../lib/csv'
import { errorMessage } from '../lib/errors'
import type { SurveyResults, SurveyWithQuestions } from '../lib/types'
import { ErrorBanner, Loading, StatusBadge } from '../components/ui'

export default function Results() {
  const { id = '' } = useParams()
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const [s, r] = await Promise.all([getSurvey(id), getResults(id)])
      setSurvey(s)
      setResults(r)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function exportCsv() {
    if (!survey) return
    setExporting(true)
    setError(null)
    try {
      const rows = await fetchExportRows(survey)
      downloadText(`${safeFilename(survey.title)}-results.csv`, buildCsv(survey, rows))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  if (error && !results) return <ErrorBanner message={error} onRetry={load} />
  if (!survey || !results) return <Loading label="Loading results..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{survey.title}</h1>
          <p className="mt-1 text-xl" aria-live="polite">
            {results.response_count} {results.response_count === 1 ? 'response' : 'responses'}{' '}
            <StatusBadge status={survey.status} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          {survey.status === 'active' && (
            <Link to={`/surveys/${id}/present`} className="btn-secondary">
              Present QR
            </Link>
          )}
          <Link to="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {results.response_count === 0 && (
        <div className="card text-center">
          <p className="text-xl font-semibold">No responses yet.</p>
          {survey.status === 'active' && (
            <p className="mt-2">
              <Link to={`/surveys/${id}/present`} className="text-blue-800 underline">
                Display the QR code
              </Link>{' '}
              so students can join.
            </p>
          )}
        </div>
      )}

      {results.questions.map((q, i) => (
        <section key={q.question_id} className="card" aria-labelledby={`q-${q.question_id}`}>
          <h2 id={`q-${q.question_id}`} className="text-xl font-bold">
            {i + 1}. {q.question_text}
          </h2>
          <p className="mb-3 text-slate-700">
            {q.response_count === 0
              ? 'Unanswered — no responses to this question yet.'
              : `${q.response_count} ${q.response_count === 1 ? 'answer' : 'answers'}`}
          </p>

          <div style={{ height: Math.max(120, q.choices.length * 56) }} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={q.choices} layout="vertical" margin={{ right: 90, left: 8 }}>
                <XAxis
                  type="number"
                  hide
                  domain={[0, Math.max(1, ...q.choices.map((c) => c.count))]}
                />
                <YAxis
                  type="category"
                  dataKey="choice_text"
                  width={140}
                  tick={{ fill: '#0f172a', fontSize: 14 }}
                />
                <Bar
                  dataKey="count"
                  fill="#1d4ed8"
                  stroke="#1e3a8a"
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(v: unknown) => String(v)}
                    style={{ fill: '#0f172a', fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible numeric version of the chart: counts and percentages */}
          <table className="mt-3 w-full text-left">
            <caption className="sr-only">Results for question {i + 1}</caption>
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-1">
                  Choice
                </th>
                <th scope="col" className="py-1 text-right">
                  Count
                </th>
                <th scope="col" className="py-1 text-right">
                  Percent
                </th>
              </tr>
            </thead>
            <tbody>
              {q.choices.map((c) => (
                <tr key={c.choice_id} className="border-b border-slate-200">
                  <td className="py-1">{c.choice_text}</td>
                  <td className="py-1 text-right">{c.count}</td>
                  <td className="py-1 text-right">{c.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
