import { useState } from 'react'
import { Button } from '../components/common/Button'
import { ButtonLink } from '../components/common/ButtonLink'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { DifficultyBreakdown } from '../components/statistics/DifficultyBreakdown'
import { FrequentlyMissed } from '../components/statistics/FrequentlyMissed'
import { MistakeDetails } from '../components/statistics/MistakeDetails'
import { MistakeStatistics } from '../components/statistics/MistakeStatistics'
import { OperationBreakdown } from '../components/statistics/OperationBreakdown'
import { RecentSessions } from '../components/statistics/RecentSessions'
import { StatisticsOverview } from '../components/statistics/StatisticsOverview'
import { useSettings } from '../hooks/useSettings'
import { useStatistics } from '../hooks/useStatistics'

export function StatisticsPage() {
  const { statistics, recentSessions, mistakePatterns, reset } = useStatistics()
  const { settings } = useSettings()
  const masteryThreshold = settings.masteryThreshold
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const hasData = statistics.attempted > 0 || recentSessions.length > 0

  const handleReset = () => {
    const erased = reset()
    setConfirmingReset(false)
    setResetMessage(
      erased
        ? 'All practice history and statistics have been erased.'
        : "We couldn't erase everything. Your browser may be blocking storage.",
    )
  }

  return (
    <section className="page-section">
      <h1>Statistics</h1>

      {resetMessage && (
        <p className="stats-message" role="status">
          {resetMessage}
        </p>
      )}

      {!hasData ? (
        <EmptyState
          title="No practice yet"
          message="Answer some questions and your progress will show up here."
        >
          <ButtonLink to="/practice/setup">Start Practice</ButtonLink>
        </EmptyState>
      ) : (
        <div className="stats-sections">
          <StatisticsOverview statistics={statistics} />
          <OperationBreakdown statistics={statistics} />
          <DifficultyBreakdown statistics={statistics} />
          <MistakeStatistics
            statistics={statistics}
            patterns={mistakePatterns}
            masteryThreshold={masteryThreshold}
          />
          <FrequentlyMissed
            statistics={statistics}
            patterns={mistakePatterns}
          />
          <MistakeDetails
            patterns={mistakePatterns}
            masteryThreshold={masteryThreshold}
          />
          <RecentSessions sessions={recentSessions} />

          <section aria-labelledby="reset-heading" className="stats-reset">
            <h2 id="reset-heading">Start over</h2>
            {confirmingReset ? (
              <ConfirmDialog
                title="Reset statistics?"
                message="Are you sure you want to erase all practice history and statistics?"
                confirmLabel="Yes, Erase Everything"
                cancelLabel="Keep My Statistics"
                onConfirm={handleReset}
                onCancel={() => setConfirmingReset(false)}
              />
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setResetMessage(null)
                  setConfirmingReset(true)
                }}
              >
                Reset Statistics
              </Button>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
