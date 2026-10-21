import { createContext } from 'react'
import type { DataProblem } from '../services/dataRepair'

export interface DataProblemsContextValue {
  /** Saved data that was damaged when the app started, and what was done. */
  problems: DataProblem[]
  /** Hides the notice about it. */
  dismiss: () => void
}

/** Nothing to report unless an AppProvider says otherwise. */
export const DataProblemsContext = createContext<DataProblemsContextValue>({
  problems: [],
  dismiss: () => {},
})
