const APP_NAME = 'Math Practice'

const PAGE_NAMES: Record<string, string> = {
  '/practice/setup': 'Practice Setup',
  '/practice/session': 'Practice',
  '/practice/summary': 'Session Summary',
  '/statistics': 'Statistics',
  '/settings': 'Settings',
}

/**
 * The title shown in the browser tab (and read out by screen readers) for a
 * page, so each page can be told apart: "Statistics – Math Practice".
 */
export function getPageTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === '/') return APP_NAME
  const name = PAGE_NAMES[path] ?? 'Page Not Found'
  return `${name} – ${APP_NAME}`
}
