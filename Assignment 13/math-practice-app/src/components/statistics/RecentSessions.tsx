import { getAccuracy } from '../../services/statisticsService'
import type { PracticeSession } from '../../types/session'
import {
  formatDateTime,
  formatDifficulty,
  formatOperations,
} from '../../utils/format'
import { AccuracyValue } from '../common/AccuracyValue'

interface RecentSessionsProps {
  /** Newest first. */
  sessions: PracticeSession[]
}

/** The latest practice sessions, newest at the top. */
export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recent sessions</h2>
      {sessions.length === 0 ? (
        <p>
          No sessions yet. Finish a practice session and it will show up here.
        </p>
      ) : (
        <ol className="recent-sessions">
          {sessions.map((session) => (
            <li key={session.id} className="recent-session">
              <p className="recent-session__when">
                <time dateTime={session.startedAt}>
                  {formatDateTime(session.startedAt)}
                </time>
              </p>
              <p className="recent-session__what">
                {formatOperations(session.operations)} ·{' '}
                {formatDifficulty(session.difficulty)}
              </p>
              <dl className="recent-session__numbers">
                <div>
                  <dt>Attempted</dt>
                  <dd>{session.attempted}</dd>
                </div>
                <div>
                  <dt>Correct</dt>
                  <dd>{session.correct}</dd>
                </div>
                <div>
                  <dt>Incorrect</dt>
                  <dd>{session.incorrect}</dd>
                </div>
                <div>
                  <dt>Accuracy</dt>
                  <dd>
                    <AccuracyValue accuracy={getAccuracy(session)} />
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
