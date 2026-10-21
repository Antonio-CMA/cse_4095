import { useState, type ReactNode } from 'react'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router'

interface TestRouterProps {
  initialEntries: InitialEntry[]
  /** Which entry to start on (the last one if left out), so "Back" has somewhere to go. */
  initialIndex?: number
  /** Usually a <Routes> element, as with MemoryRouter. */
  children: ReactNode
}

/**
 * Like <MemoryRouter>, but a data router, which is what the app itself uses.
 * Pages that block navigation (useBlocker) only work inside one of these. The
 * children are fixed when it first renders.
 */
export function TestRouter({
  initialEntries,
  initialIndex,
  children,
}: TestRouterProps) {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: children }], {
      initialEntries,
      initialIndex,
    }),
  )
  return <RouterProvider router={router} />
}
