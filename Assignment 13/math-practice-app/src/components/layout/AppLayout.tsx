import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { getPageTitle } from '../../utils/pageTitles'
import { DataRepairNotice } from '../common/DataRepairNotice'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { LoadingMessage } from '../common/LoadingMessage'
import { StorageWarning } from '../common/StorageWarning'
import { Header } from './Header'
import { PageContainer } from './PageContainer'

/**
 * On every page change: update the browser tab title, and (after the first
 * page) move keyboard and screen-reader focus to the new page's heading so
 * they start from the top of the new content instead of where the old page was.
 */
function useAnnouncePageChange() {
  const { pathname } = useLocation()
  const isFirstPage = useRef(true)

  useEffect(() => {
    document.title = getPageTitle(pathname)

    if (isFirstPage.current) {
      isFirstPage.current = false
      return
    }
    const heading = document.querySelector<HTMLElement>('#main-content h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    } else {
      document.getElementById('main-content')?.focus()
    }
  }, [pathname])
}

export function AppLayout() {
  useAnnouncePageChange()
  const { pathname } = useLocation()

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <PageContainer>
        <StorageWarning />
        <DataRepairNotice />
        {/* A page that breaks shows a friendly message, and the menu still works. */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<LoadingMessage />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </PageContainer>
    </>
  )
}
