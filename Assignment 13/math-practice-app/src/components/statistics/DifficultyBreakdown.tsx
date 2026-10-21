import type { AppStatistics } from '../../types/statistics'
import { formatDifficulty } from '../../utils/format'
import { DIFFICULTY_OPTIONS } from '../../utils/practiceOptions'
import { StatCard } from './StatCard'

interface DifficultyBreakdownProps {
  statistics: AppStatistics
}

/** One card per level, each clearly labelled ("Level 2: Easy"). */
export function DifficultyBreakdown({ statistics }: DifficultyBreakdownProps) {
  return (
    <section aria-labelledby="by-difficulty-heading">
      <h2 id="by-difficulty-heading">By level</h2>
      <div className="stat-card-grid">
        {DIFFICULTY_OPTIONS.map(({ value }) => (
          <StatCard
            key={value}
            title={formatDifficulty(value)}
            counts={statistics.byDifficulty[value]}
          />
        ))}
      </div>
    </section>
  )
}
