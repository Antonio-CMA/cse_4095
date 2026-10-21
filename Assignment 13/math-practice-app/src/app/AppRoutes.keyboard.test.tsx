import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadAttempts, loadSessions } from '../services/practiceHistory'
import { TestRouter } from '../test/TestRouter'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

type User = ReturnType<typeof userEvent.setup>

function renderApp(path: string) {
  return render(
    <AppProvider>
      <TestRouter initialEntries={[path]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

/**
 * Presses Tab until the control with this role and name has focus, as a
 * keyboard user would, and returns how many presses it took. It fails if the
 * control cannot be reached.
 */
async function tabTo(
  user: User,
  role: Parameters<typeof screen.getByRole>[0],
  name: string | RegExp,
  limit = 60,
): Promise<number> {
  const target = screen.getByRole(role, { name })
  for (let presses = 1; presses <= limit; presses++) {
    await user.tab()
    if (document.activeElement === target) return presses
  }
  throw new Error(`Could not reach the ${role} "${String(name)}" with Tab`)
}

describe('a whole visit, using only the keyboard', () => {
  it('sets up, answers every question, reads the summary and goes home', async () => {
    const user = userEvent.setup()
    renderApp('/practice/setup')

    // Choose Addition (Space), and 5 questions (arrow key within the group).
    await tabTo(user, 'checkbox', 'Addition')
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()

    await tabTo(user, 'radio', /^10 questions/)
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()

    await tabTo(user, 'button', 'Start Session')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()

    // Every question: choose with a number key, turn the card, give a verdict.
    for (let question = 1; question <= 5; question++) {
      await user.keyboard('1')
      // Four answers, then Flip Card.
      await tabTo(user, 'button', 'Flip Card', 5)
      await user.keyboard('{Enter}')
      await tabTo(
        user,
        'button',
        question % 2 ? 'I Got It Right' : 'I Got It Wrong',
        3,
      )
      await user.keyboard('{Enter}')
    }

    expect(
      screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Correct').nextSibling).toHaveTextContent('3')

    // Focus starts at the top of the new page; leave by keyboard too.
    await tabTo(user, 'link', 'Return Home')
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Welcome to Math Practice!',
      }),
    ).toBeInTheDocument()

    expect(loadAttempts()).toHaveLength(5)
    expect(loadSessions()).toHaveLength(1)
  })

  it('never makes the student tab back through the page between questions', async () => {
    const user = userEvent.setup()
    renderApp('/practice/setup')
    await tabTo(user, 'checkbox', 'Addition')
    await user.keyboard(' ')
    await tabTo(user, 'button', 'Start Session')
    await user.keyboard('{Enter}')

    for (let question = 1; question <= 3; question++) {
      await user.keyboard('2')
      // From the page heading (first question) or from the card just brought
      // up (later ones), Flip Card is five stops away: four answers, then it.
      // Without that, each later question would cost a trip through the header.
      const presses = await tabTo(user, 'button', 'Flip Card', 6)
      expect(presses).toBeLessThanOrEqual(5)
      await user.keyboard('{Enter}')
      await tabTo(user, 'button', 'I Got It Right', 3)
      await user.keyboard('{Enter}')
    }
  })

  it('puts focus on the new question after an answer', async () => {
    const user = userEvent.setup()
    renderApp('/practice/setup')
    await tabTo(user, 'checkbox', 'Addition')
    await user.keyboard(' ')
    await tabTo(user, 'button', 'Start Session')
    await user.keyboard('{Enter}')

    await user.keyboard('1')
    await tabTo(user, 'button', 'Flip Card')
    await user.keyboard('{Enter}')
    await tabTo(user, 'button', 'I Got It Right', 3)
    await user.keyboard('{Enter}')

    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Question' })).toHaveFocus()
  })

  it('does not take focus from the page on the very first question', async () => {
    const user = userEvent.setup()
    renderApp('/practice/setup')
    await tabTo(user, 'checkbox', 'Addition')
    await user.keyboard(' ')
    await tabTo(user, 'button', 'Start Session')
    await user.keyboard('{Enter}')

    // The page heading has focus (set by the page change), not the card.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toHaveFocus()
  })
})
