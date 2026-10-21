import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logDevError } from '../../utils/devLog'
import { ErrorMessage } from './ErrorMessage'

interface ErrorBoundaryProps {
  children: ReactNode
  /** When this changes (for example the page), a shown error is cleared. */
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches a mistake while drawing a page, so the student sees a friendly
 * message instead of a blank screen. The cause goes to the developer console
 * only; it is never shown on the page.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logDevError('A page failed to display.', {
      error,
      componentStack: info.componentStack,
    })
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    // Moving to another page gives it a fresh start.
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <ErrorMessage>
        <p>
          Something unexpected happened, and this page could not be shown. It
          was not your fault. You can go back to the home page and try again.
        </p>
      </ErrorMessage>
    )
  }
}
