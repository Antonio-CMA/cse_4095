import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PrivacyPage } from './PrivacyPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  )
}

describe('the privacy page', () => {
  it('has a clear heading and a section for each question a parent would ask', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toBeInTheDocument()
    for (const name of [
      'What we collect',
      'What is saved on this device',
      'What the app never does',
      'Who can see your progress',
      'Clearing your data',
    ]) {
      expect(
        screen.getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument()
    }
  })

  it('says nothing is collected, and that there are no accounts', () => {
    renderPage()
    expect(screen.getByText(/^Nothing\. There are no accounts/)).toBeVisible()
    expect(
      screen.getByText(/never shared|not shared with other\s+devices/s),
    ).toBeInTheDocument()
  })

  it('lists what is saved, and says it stays in this browser', () => {
    renderPage()
    for (const item of [
      'your settings',
      'your practice sessions and answers',
      'your statistics',
      'the questions you missed',
      'a bookmark of the session you are in the middle of',
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    expect(
      screen.getByText(/stay on this device, in this browser/),
    ).toBeVisible()
  })

  it('says what it never does: tracking, cookies, adverts, outside links', () => {
    renderPage()
    expect(
      screen.getByText('It does not track you or count visits.'),
    ).toBeVisible()
    expect(screen.getByText('It does not use cookies.')).toBeVisible()
    expect(screen.getByText('It does not show adverts.')).toBeVisible()
    expect(
      screen.getByText('It does not link to other websites.'),
    ).toBeVisible()
  })

  it('is honest that the website that hosts the app may keep ordinary visit records', () => {
    renderPage()
    expect(
      screen.getByText(/may keep ordinary records of visits/),
    ).toBeVisible()
  })

  it('explains that clearing browser data erases progress for good', () => {
    renderPage()
    expect(
      screen.getByText(
        /Clearing your browser's data for this site erases your progress/,
      ),
    ).toBeVisible()
    expect(screen.getByText(/cannot be brought back/)).toBeVisible()
    expect(
      screen.getByText(/private or incognito window forgets everything/),
    ).toBeVisible()
  })

  it('points to the way to erase progress on purpose', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('has no links to other websites', () => {
    renderPage()
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\//)
    }
  })
})
