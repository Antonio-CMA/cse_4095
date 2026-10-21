import { useContext } from 'react'
import { DataProblemsContext } from '../../app/dataProblemsContext'
import { describeDataProblem } from '../../utils/dataProblemMessages'
import { Button } from './Button'

/**
 * Tells the student that some saved data was damaged and what was done, and
 * that nothing else was touched.
 */
export function DataRepairNotice() {
  const { problems, dismiss } = useContext(DataProblemsContext)
  if (problems.length === 0) return null

  return (
    <div className="app-notice" role="status">
      <div className="app-notice__text">
        <p>
          <strong>We fixed some saved data.</strong>
        </p>
        <ul>
          {problems.map((problem) => (
            <li key={problem.category}>{describeDataProblem(problem)}</li>
          ))}
        </ul>
        <p>Everything else was kept.</p>
      </div>
      <Button variant="secondary" onClick={dismiss}>
        Got It
      </Button>
    </div>
  )
}
