import type { AppStatistics } from '../../types/statistics'
import { OPERATION_OPTIONS } from '../../utils/practiceOptions'
import { StatCard } from './StatCard'

interface OperationBreakdownProps {
  statistics: AppStatistics
}

/** One card per operation: addition, subtraction, multiplication, division. */
export function OperationBreakdown({ statistics }: OperationBreakdownProps) {
  return (
    <section aria-labelledby="by-operation-heading">
      <h2 id="by-operation-heading">By operation</h2>
      <div className="stat-card-grid">
        {OPERATION_OPTIONS.map(({ value, label }) => (
          <StatCard
            key={value}
            title={label}
            counts={statistics.byOperation[value]}
          />
        ))}
      </div>
    </section>
  )
}
