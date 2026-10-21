import { useEffect, useRef, type ReactNode } from 'react'

interface ErrorMessageProps {
  title?: string
  children: ReactNode
}

/**
 * A friendly full-page message for when something has gone wrong. It says what
 * happened in plain words (never technical details) and always offers a safe
 * way out: a plain link to the home page, which loads the app afresh in case
 * whatever broke is still in memory.
 */
export function ErrorMessage({
  title = 'Oops! Something went wrong',
  children,
}: ErrorMessageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Screen readers and keyboards start at the explanation.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="page-section error-message" role="alert">
      <h1 ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {children}
      <a className="btn btn--primary" href={import.meta.env.BASE_URL}>
        Go Home
      </a>
    </section>
  )
}
