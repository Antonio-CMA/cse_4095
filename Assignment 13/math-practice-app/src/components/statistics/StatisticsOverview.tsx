import type { AppStatistics } from '../../types/statistics'
import { AccuracyValue } from '../common/AccuracyValue'
import { getAccuracy } from '../../services/statisticsService'

interface StatisticsOverviewProps {
  statistics: AppStatistics
}

/** The big totals across all practice. */
export function StatisticsOverview({ statistics }: StatisticsOverviewProps) {
  return (
    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overall</h2>
      <dl className="summary-stats">
        <div className="summary-stat">
          <dt>Questions attempted</dt>
          <dd>{statistics.attempted}</dd>
        </div>
        <div className="summary-stat">
          <dt>Correct</dt>
          <dd>{statistics.correct}</dd>
        </div>
        <div className="summary-stat">
          <dt>Incorrect</dt>
          <dd>{statistics.incorrect}</dd>
        </div>
        <div className="summary-stat">
          <dt>Accuracy</dt>
          <dd>
            <AccuracyValue accuracy={getAccuracy(statistics)} />
          </dd>
        </div>
      </dl>
    </section>
  )
}
