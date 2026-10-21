import { describe, expect, it } from 'vitest'
import { getPageTitle } from './pageTitles'

describe('getPageTitle', () => {
  it('uses just the app name for the home page', () => {
    expect(getPageTitle('/')).toBe('Math Practice')
  })

  it('names every other page, followed by the app name', () => {
    expect(getPageTitle('/practice/setup')).toBe(
      'Practice Setup – Math Practice',
    )
    expect(getPageTitle('/practice/session')).toBe('Practice – Math Practice')
    expect(getPageTitle('/practice/summary')).toBe(
      'Session Summary – Math Practice',
    )
    expect(getPageTitle('/statistics')).toBe('Statistics – Math Practice')
    expect(getPageTitle('/settings')).toBe('Settings – Math Practice')
  })

  it('gives every page a different title', () => {
    const titles = [
      '/',
      '/practice/setup',
      '/practice/session',
      '/practice/summary',
      '/statistics',
      '/settings',
    ].map(getPageTitle)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('ignores a trailing slash', () => {
    expect(getPageTitle('/statistics/')).toBe(getPageTitle('/statistics'))
  })

  it('has a clear title for an unknown page', () => {
    expect(getPageTitle('/nope')).toBe('Page Not Found – Math Practice')
    expect(getPageTitle('/practice/other')).toBe(
      'Page Not Found – Math Practice',
    )
  })
})
