import { ButtonLink } from '../components/common/ButtonLink'

export function HomePage() {
  return (
    <section className="page-section home">
      <h1>Welcome to Math Practice!</h1>
      <p className="home__message">
        Flip the cards, test your brain, and get better at math one question at
        a time.
      </p>
      <div className="home__actions">
        <ButtonLink to="/practice/setup">Start Practice</ButtonLink>
        <ButtonLink to="/statistics" variant="secondary">
          View Statistics
        </ButtonLink>
        <ButtonLink to="/settings" variant="secondary">
          Settings
        </ButtonLink>
      </div>
    </section>
  )
}
