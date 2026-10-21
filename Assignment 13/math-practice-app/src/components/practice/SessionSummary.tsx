import type { ReactNode } from 'react'
import type { SessionResult } from '../../types/session'
import { formatDifficulty, formatOperations } from '../../utils/format'
import { calculateAccuracy } from '../../utils/math'

interface SessionSummaryProps {
  result: SessionResult
}

/** The numbers for a finished practice session. */
export function SessionSummary({ result }: SessionSummaryProps) {
  const { session, attempts } = result
  const accuracy = calculateAccuracy(session.correct, session.attempted)
  const reviewCount = attempts.filter(
    (a) => a.source === 'mistake-review',
  ).length

  return (
    <dl className="summary-stats">
      <Stat label="Questions attempted" value={session.attempted} />
      <Stat label="Correct" value={session.correct} />
      <Stat label="Incorrect" value={session.incorrect} />
      <Stat
        label="Accuracy"
        value={
          accuracy === null ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="visually-hidden">No questions answered</span>
            </>
          ) : (
            `${accuracy}%`
          )
        }
      />
      <Stat label="Mistake-review questions" value={reviewCount} />
      <Stat
        wide
        label="Operations practiced"
        value={formatOperations(session.operations)}
      />
      <Stat wide label="Level" value={formatDifficulty(session.difficulty)} />
    </dl>
  )
}

function Stat({
  label,
  value,
  wide = false,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'summary-stat summary-stat--wide' : 'summary-stat'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
