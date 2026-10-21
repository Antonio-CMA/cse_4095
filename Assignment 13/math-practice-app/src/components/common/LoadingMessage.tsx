/**
 * Shown for a moment while a page that is loaded on demand is on its way. It is
 * only seen when the page is opened directly or the connection is slow; moving
 * between pages keeps the old page on screen until the new one is ready.
 */
export function LoadingMessage() {
  return (
    <section className="page-section" role="status">
      <p>Loading…</p>
    </section>
  )
}
