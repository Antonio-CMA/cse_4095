import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <main id="main-content" className="page-container" tabIndex={-1}>
      {children}
    </main>
  )
}
