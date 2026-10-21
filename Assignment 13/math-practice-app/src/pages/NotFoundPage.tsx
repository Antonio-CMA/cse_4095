import { ButtonLink } from '../components/common/ButtonLink'

export function NotFoundPage() {
  return (
    <section className="page-section">
      <h1>Page Not Found</h1>
      <p>Oops! We couldn&apos;t find the page you were looking for.</p>
      <ButtonLink to="/">Go Home</ButtonLink>
    </section>
  )
}
