import { useId } from 'react'
import { getAccuracy } from '../../services/statisticsService'
import type { OperationStatistics } from '../../types/statistics'
import { AccuracyValue } from '../common/AccuracyValue'

interface StatCardProps {
  title: string
  counts: OperationStatistics
}

/** Attempted, correct, incorrect and accuracy for one group of questions. */
export function StatCard({ title, counts }: StatCardProps) {
  const titleId = useId()

  return (
    <article className="stat-card" aria-labelledby={titleId}>
      <h3 id={titleId} className="stat-card__title">
        {title}
      </h3>
      <dl className="stat-card__list">
        <div>
          <dt>Attempted</dt>
          <dd>{counts.attempted}</dd>
        </div>
        <div>
          <dt>Correct</dt>
          <dd>{counts.correct}</dd>
        </div>
        <div>
          <dt>Incorrect</dt>
          <dd>{counts.incorrect}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>
            <AccuracyValue accuracy={getAccuracy(counts)} />
          </dd>
        </div>
      </dl>
    </article>
  )
}
