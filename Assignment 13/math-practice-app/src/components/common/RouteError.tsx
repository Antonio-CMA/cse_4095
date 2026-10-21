import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { logDevError } from '../../utils/devLog'
import { ErrorMessage } from './ErrorMessage'

/**
 * The last safety net, used by the router when a mistake gets past everything
 * else (for example in the page frame itself). It has to stand on its own,
 * because the usual page frame may be what broke.
 */
export function RouteError() {
  const error = useRouteError()
  useEffect(() => {
    logDevError('The app hit an error it could not recover from.', error)
  }, [error])

  return (
    <main className="page-container">
      <ErrorMessage>
        <p>
          Something unexpected happened. It was not your fault. You can go back
          to the home page and try again.
        </p>
      </ErrorMessage>
    </main>
  )
}
