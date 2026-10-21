import { Outlet } from 'react-router'
import { Header } from './Header'
import { PageContainer } from './PageContainer'

export function AppLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <PageContainer>
        <Outlet />
      </PageContainer>
    </>
  )
}
