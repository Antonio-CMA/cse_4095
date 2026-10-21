interface PlaceholderPageProps {
  title: string
}

/** Temporary stand-in for pages that are built in later phases. */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="page-section">
      <h1>{title}</h1>
      <p>This page is coming soon!</p>
    </section>
  )
}
