import type { MistakePattern } from '../../types/mistake'
import type { AppStatistics } from '../../types/statistics'
import { formatList } from '../../utils/format'
import {
  getMostMissedFacts,
  getMostMissedOperations,
} from '../../utils/mistakeStats'
import { OPERATION_OPTIONS } from '../../utils/practiceOptions'
import { formatSolution } from '../../utils/questionText'
import { EmptyState } from '../common/EmptyState'

interface FrequentlyMissedProps {
  statistics: AppStatistics
  patterns: MistakePattern[]
}

const OPERATION_LABELS = Object.fromEntries(
  OPERATION_OPTIONS.map((o) => [o.value, o.label]),
)

function times(n: number): string {
  return n === 1 ? '1 time' : `${n} times`
}

/** Where the student misses most: the operation, and the number facts. */
export function FrequentlyMissed({
  statistics,
  patterns,
}: FrequentlyMissedProps) {
  const operation = getMostMissedOperations(statistics)
  const facts = getMostMissedFacts(patterns)

  return (
    <section aria-labelledby="frequently-missed-heading">
      <h2 id="frequently-missed-heading">Where you miss most</h2>

      {!operation && facts.length === 0 ? (
        <EmptyState
          title="No mistakes yet"
          message="Nothing has been missed so far. Keep it up!"
        />
      ) : (
        <div className="missed-grid">
          {operation && (
            <div className="missed-card">
              <h3 className="missed-card__title">Operation you miss most</h3>
              <p className="missed-card__main">
                {formatList(
                  operation.operations.map((op) => OPERATION_LABELS[op]),
                )}
              </p>
              <p className="missed-card__note">
                {operation.operations.length > 1
                  ? `${times(operation.misses)} each`
                  : `Missed ${times(operation.misses)}`}
              </p>
            </div>
          )}

          {facts.length > 0 && (
            <div className="missed-card">
              <h3 className="missed-card__title">Number facts you miss most</h3>
              <ol className="missed-facts">
                {facts.map((pattern) => (
                  <li key={pattern.id}>
                    <span className="missed-facts__fact">
                      {formatSolution(pattern)}
                    </span>
                    <span className="missed-facts__count">
                      missed {times(pattern.incorrectCount)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
