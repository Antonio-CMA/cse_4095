import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { MistakePattern } from '../../types/mistake'
import { formatDate, formatDifficulty } from '../../utils/format'
import {
  getMasteryProgress,
  sortPatternsByMisses,
  splitByMastery,
} from '../../utils/mistakeStats'
import { formatSolution } from '../../utils/questionText'
import { Button } from '../common/Button'
import { ProgressBar } from '../practice/ProgressBar'

/**
 * How many mistakes are listed at first, and how many more each press of "Show
 * more" adds. A student can have up to a thousand saved mistakes, and drawing
 * them all made the page take most of a second to open on a fast computer.
 */
export const MISTAKES_PER_PAGE = 25

interface MistakeDetailsProps {
  patterns: MistakePattern[]
  /** Right answers needed to master a mistake (from the settings). */
  masteryThreshold: number
}

function missed(n: number): string {
  return n === 1 ? 'Missed 1 time' : `Missed ${n} times`
}

const MistakeItem = memo(function MistakeItem({
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
})

/** One list of mistakes, a page at a time. `patterns` is already in order. */
function MistakeList({
  patterns,
  label,
  masteryThreshold,
  mastered,
}: {
  patterns: MistakePattern[]
  label: string
  masteryThreshold: number
  mastered: boolean
}) {
  const [visible, setVisible] = useState(MISTAKES_PER_PAGE)
  const statusRef = useRef<HTMLParagraphElement>(null)
  // Set when the last of the list is revealed, because the button then goes
  // away and keyboard focus would be left with nothing.
  const focusStatus = useRef(false)

  const shown = patterns.slice(0, visible)
  const hidden = patterns.length - shown.length

  useEffect(() => {
    if (focusStatus.current && hidden === 0) {
      focusStatus.current = false
      statusRef.current?.focus()
    }
  }, [hidden])

  const showMore = () => {
    if (visible + MISTAKES_PER_PAGE >= patterns.length) {
      focusStatus.current = true
    }
    setVisible(visible + MISTAKES_PER_PAGE)
  }

  return (
    <>
      <ul className="mistake-list" aria-label={label}>
        {shown.map((pattern) => (
          <MistakeItem
            key={pattern.id}
            pattern={pattern}
            masteryThreshold={masteryThreshold}
            mastered={mastered}
          />
        ))}
      </ul>
      {patterns.length > MISTAKES_PER_PAGE && (
        <div className="mistake-more">
          <p ref={statusRef} role="status" tabIndex={-1}>
            {hidden > 0
              ? `Showing ${shown.length} of ${patterns.length}.`
              : `Showing all ${patterns.length}.`}
          </p>
          {hidden > 0 && (
            <Button variant="secondary" onClick={showMore}>
              Show {Math.min(MISTAKES_PER_PAGE, hidden)} more
            </Button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Every saved mistake: the ones still being practised (most missed first),
 * with how far each is towards mastery, and the mastered ones tucked away in a
 * section of their own. Long lists show a page at a time.
 */
export const MistakeDetails = memo(function MistakeDetails({
  patterns,
  masteryThreshold,
}: MistakeDetailsProps) {
  // Sorting and splitting up to a thousand mistakes is only redone when the
  // mistakes or the mastery setting change, not whenever the page is redrawn.
  const { active, mastered } = useMemo(() => {
    const split = splitByMastery(patterns, masteryThreshold)
    return {
      active: sortPatternsByMisses(split.active),
      mastered: sortPatternsByMisses(split.mastered),
    }
  }, [patterns, masteryThreshold])

  return (
    <section aria-labelledby="mistake-details-heading">
      <h2 id="mistake-details-heading">Your mistakes</h2>

      {patterns.length === 0 ? (
        <p>No mistakes yet. Questions you miss will be listed here.</p>
      ) : active.length === 0 ? (
        <p>You have mastered every mistake so far. Great work!</p>
      ) : (
        <MistakeList
          patterns={active}
          label="Mistakes to practise"
          masteryThreshold={masteryThreshold}
          mastered={false}
        />
      )}

      {mastered.length > 0 && (
        <details className="mistake-mastered">
          <summary>Mastered mistakes ({mastered.length})</summary>
          <MistakeList
            patterns={mastered}
            label="Mastered mistakes"
            masteryThreshold={masteryThreshold}
            mastered
          />
        </details>
      )}
    </section>
  )
})
