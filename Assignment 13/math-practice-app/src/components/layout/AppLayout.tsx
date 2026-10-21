import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { getPageTitle } from '../../utils/pageTitles'
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
