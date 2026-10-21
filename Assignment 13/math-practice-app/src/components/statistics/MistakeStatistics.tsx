import type { MistakePattern } from '../../types/mistake'
import type { AppStatistics } from '../../types/statistics'
import { splitByMastery } from '../../utils/mistakeStats'

interface MistakeStatisticsProps {
  statistics: AppStatistics
  patterns: MistakePattern[]
  /** Right answers needed to master a mistake (from the settings). */
  masteryThreshold: number
}

/** How many mistakes there are, how many are mastered, and review practice. */
export function MistakeStatistics({
  statistics,
  patterns,
  masteryThreshold,
}: MistakeStatisticsProps) {
  const { active, mastered } = splitByMastery(patterns, masteryThreshold)

  return (
    <section aria-labelledby="mistake-stats-heading">
      <h2 id="mistake-stats-heading">Mistakes</h2>
      <dl className="summary-stats">
        <div className="summary-stat">
          <dt>Mistakes to practise</dt>
          <dd>{active.length}</dd>
        </div>
        <div className="summary-stat">
          <dt>Mistakes mastered</dt>
          <dd>{mastered.length}</dd>
        </div>
        <div className="summary-stat">
          <dt>Similar questions practised</dt>
          <dd>{statistics.review.attempted}</dd>
        </div>
        <div className="summary-stat">
          <dt>Review questions answered correctly</dt>
          <dd>{statistics.review.correct}</dd>
        </div>
      </dl>
    </section>
  )
}
