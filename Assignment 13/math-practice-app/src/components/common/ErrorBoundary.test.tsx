import { render, screen } from '@testing-library/react'
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorMessage } from './ErrorMessage'
import { RouteError } from './RouteError'

/** React reports a caught error on the console; keep the test output clean. */
function quietConsole() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

function Boom(): never {
  throw new Error('secret technical detail: line 42 of Nowhere.tsx')
}

describe('ErrorMessage', () => {
  it('explains itself and says it is an alert', () => {
    render(
      <ErrorMessage>
        <p>Please try again.</p>
      </ErrorMessage>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Oops! Something went wrong',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Please try again.')).toBeInTheDocument()
  })

  it('takes a different title', () => {
    render(<ErrorMessage title="Nothing here">x</ErrorMessage>)
    expect(
      screen.getByRole('heading', { name: 'Nothing here' }),
    ).toBeInTheDocument()
  })

  it('offers a plain link home, which loads the app afresh', () => {
    render(<ErrorMessage>x</ErrorMessage>)
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('moves focus to the explanation', () => {
    render(<ErrorMessage>x</ErrorMessage>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
})

describe('ErrorBoundary', () => {
  it('shows its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All fine')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a friendly message instead of a blank page when something breaks', () => {
    quietConsole()
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something unexpected happened',
    )
    expect(screen.getByRole('link', { name: 'Go Home' })).toBeInTheDocument()
  })

  it('never shows technical details or a stack trace to the student', () => {
    quietConsole()
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    const shown = container.textContent ?? ''
    expect(shown).not.toMatch(/secret technical detail|Nowhere\.tsx|Error:|at /)
    expect(shown).not.toMatch(/stack|undefined|\.tsx/i)
  })

  it('tells developers what went wrong', () => {
    const log = quietConsole()
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    const ours = log.mock.calls.find(
      ([first]) => first === '[Math Practice] A page failed to display.',
    )
    expect(ours).toBeDefined()
    expect(String((ours![1] as { error: Error }).error.message)).toMatch(
      /secret technical detail/,
    )
  })

  it('starts fresh when the reset key changes (another page)', () => {
    quietConsole()
    let broken = true
    function Sometimes() {
      if (broken) throw new Error('oops')
      return <p>Recovered</p>
    }

    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Sometimes />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    broken = false
    rerender(
      <ErrorBoundary resetKey="/a">
        <Sometimes />
      </ErrorBoundary>,
    )
    // Same page: the message stays.
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="/b">
        <Sometimes />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('RouteError', () => {
  function renderRoutes(routes: RouteObject[]) {
    return render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/'] })}
      />,
    )
  }

  it('catches what gets past everything else, in a page of its own', () => {
    const log = quietConsole()
    renderRoutes([
      { path: '/', element: <Boom />, errorElement: <RouteError /> },
    ])

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something unexpected happened',
    )
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(document.body.textContent).not.toMatch(/secret technical detail/)
    expect(
      log.mock.calls.some(
        ([first]) =>
          first ===
          '[Math Practice] The app hit an error it could not recover from.',
      ),
    ).toBe(true)
  })
})
