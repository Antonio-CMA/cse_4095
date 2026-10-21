import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('AppRoutes', () => {
  it.each([
    ['/', 'Welcome to Math Practice!'],
    ['/practice/setup', 'Practice Setup'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
  ])('renders %s', (path, heading) => {
    renderAt(path)
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('sends /practice/session back to setup when there is no session to run', () => {
    renderAt('/practice/session')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('sends /practice/summary back to setup when there are no results', () => {
    renderAt('/practice/summary')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('plays a whole session, shows the summary, and can start again', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    const verdicts = ['I Got It Right', 'I Got It Wrong', 'I Got It Right']
    for (let i = 0; i < 5; i++) {
      const front = screen.getByRole('region', { name: 'Question' })
      await user.click(
        within(front).getAllByRole('button', { pressed: false })[0],
      )
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(
        screen.getByRole('button', { name: verdicts[i % verdicts.length] }),
      )
    }

    // 5 answers: right, wrong, right, right, wrong → 3 correct, 2 incorrect
    expect(
      screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Questions attempted').nextSibling,
    ).toHaveTextContent('5')
    expect(screen.getByText('Correct').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Incorrect').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Accuracy').nextSibling).toHaveTextContent('60%')
    expect(
      screen.getByText('Operations practiced').nextSibling,
    ).toHaveTextContent('Addition')

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })

  it('shows a played session on the statistics page, and can erase it', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')

    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    for (const verdict of [
      'I Got It Right',
      'I Got It Right',
      'I Got It Wrong',
      'I Got It Right',
      'I Got It Wrong',
    ]) {
      const front = screen.getByRole('region', { name: 'Question' })
      await user.click(
        within(front).getAllByRole('button', { pressed: false })[0],
      )
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(screen.getByRole('button', { name: verdict }))
    }

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))

    const overall = screen.getByRole('region', { name: 'Overall' })
    expect(
      within(overall).getByText('Questions attempted').nextSibling,
    ).toHaveTextContent('5')
    expect(within(overall).getByText('Correct').nextSibling).toHaveTextContent(
      '3',
    )
    expect(within(overall).getByText('Accuracy').nextSibling).toHaveTextContent(
      '60%',
    )

    const division = within(
      screen.getByRole('region', { name: 'By operation' }),
    ).getByRole('article', { name: 'Division' })
    expect(
      within(division).getByText('Attempted').nextSibling,
    ).toHaveTextContent('5')

    const recent = screen.getByRole('region', { name: 'Recent sessions' })
    expect(within(recent).getAllByRole('listitem')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )
    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()
  })

  it('turns missed questions into a review session that can master them', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')

    // 1. Practice, and get everything wrong.
    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    const answer = async (verdict: string) => {
      const front = screen.getByRole('region', { name: 'Question' })
      await user.click(
        within(front).getAllByRole('button', { pressed: false })[0],
      )
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(screen.getByRole('button', { name: verdict }))
    }
    for (let i = 0; i < 5; i++) await answer('I Got It Wrong')

    // 2. The summary now offers to practise the mistakes.
    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Practice Mistakes' }),
    ).toBeInTheDocument()

    // 3. Review again and again, answering correctly, until every mistake is
    //    mastered. (Each review session is 5 questions long, like the first.)
    let reviewSessions = 0
    for (let round = 0; round < 10; round++) {
      const link = screen.queryByRole('link', { name: 'Practice Mistakes' })
      if (!link) break
      await user.click(link)
      reviewSessions++
      expect(
        screen.getByRole('heading', { level: 1, name: 'Practice' }),
      ).toBeInTheDocument()
      for (let i = 0; i < 10; i++) {
        if (screen.queryByRole('heading', { name: 'Session Summary' })) break
        await answer('I Got It Right')
      }
    }

    expect(reviewSessions).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mistake-review questions').nextSibling,
    ).not.toHaveTextContent('0')
    // Everything is mastered now, so there is nothing left to practise.
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
  }, 60_000)

  it('runs a session started from the setup page', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')

    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /×.*= \?/ }),
    ).toBeInTheDocument()
  })

  it('shows the fallback page for unknown routes', () => {
    renderAt('/does-not-exist')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page Not Found' }),
    ).toBeInTheDocument()
  })

  it('navigates from the home buttons to their pages', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('link', { name: 'Start Practice' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('returns home from the fallback page', async () => {
    const user = userEvent.setup()
    renderAt('/nope')

    await user.click(screen.getByRole('link', { name: 'Go Home' }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Welcome to Math Practice!',
      }),
    ).toBeInTheDocument()
  })
})
