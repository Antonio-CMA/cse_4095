import type { MistakePattern } from '../../types/mistake'
import { formatDate, formatDifficulty } from '../../utils/format'
import {
  getMasteryProgress,
  sortPatternsByMisses,
  splitByMastery,
} from '../../utils/mistakeStats'
import { formatSolution } from '../../utils/questionText'
import { ProgressBar } from '../practice/ProgressBar'

interface MistakeDetailsProps {
  patterns: MistakePattern[]
  /** Right answers needed to master a mistake (from the settings). */
  masteryThreshold: number
}

function missed(n: number): string {
  return n === 1 ? 'Missed 1 time' : `Missed ${n} times`
}

function MistakeItem({
  pattern,
  masteryThreshold,
  mastered,
}: {
  pattern: MistakePattern
  masteryThreshold: number
  mastered: boolean
}) {
  const fact = formatSolution(pattern)
  const { done, needed } = getMasteryProgress(pattern, masteryThreshold)

  return (
    <li className="mistake-item">
      <p className="mistake-item__fact">{fact}</p>
      <p className="mistake-item__meta">
        {formatDifficulty(pattern.difficulty)} ·{' '}
        {missed(pattern.incorrectCount)} · Last missed{' '}
        <time dateTime={pattern.lastIncorrectAt}>
          {formatDate(pattern.lastIncorrectAt)}
        </time>
      </p>
      {mastered ? (
        <p className="mistake-item__mastered">Mastered ✓</p>
      ) : (
        <div className="mistake-item__progress">
          <ProgressBar
            value={done}
            max={needed}
            label={`Review progress for ${fact}`}
          />
          <p className="mistake-item__progress-text">
            {done} of {needed} right in review
          </p>
        </div>
      )}
    </li>
  )
}

/**
 * Every saved mistake: the ones still being practised (most missed first),
 * with how far each is towards mastery, and the mastered ones tucked away in a
 * section of their own.
 */
export function MistakeDetails({
  patterns,
  masteryThreshold,
}: MistakeDetailsProps) {
  const { active, mastered } = splitByMastery(patterns, masteryThreshold)

  return (
    <section aria-labelledby="mistake-details-heading">
      <h2 id="mistake-details-heading">Your mistakes</h2>

      {patterns.length === 0 ? (
        <p>No mistakes yet. Questions you miss will be listed here.</p>
      ) : active.length === 0 ? (
        <p>You have mastered every mistake so far. Great work!</p>
      ) : (
        <ul className="mistake-list" aria-label="Mistakes to practise">
          {sortPatternsByMisses(active).map((pattern) => (
            <MistakeItem
              key={pattern.id}
              pattern={pattern}
              masteryThreshold={masteryThreshold}
              mastered={false}
            />
          ))}
        </ul>
      )}

      {mastered.length > 0 && (
        <details className="mistake-mastered">
          <summary>Mastered mistakes ({mastered.length})</summary>
          <ul className="mistake-list" aria-label="Mastered mistakes">
            {sortPatternsByMisses(mastered).map((pattern) => (
              <MistakeItem
                key={pattern.id}
                pattern={pattern}
                masteryThreshold={masteryThreshold}
                mastered
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
