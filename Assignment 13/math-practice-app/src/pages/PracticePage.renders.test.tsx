import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler } from 'react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { TestRouter } from '../test/TestRouter'
import type { PracticeConfig } from '../types/session'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 'continuous',
  reviewMode: 'regular',
}

/**
 * Renders the practice page and counts how many times React redraws it (each
 * "commit"). Each action a student takes should cost exactly one: the card
 * remembers its own progress for the refresh bookmark without redrawing the
 * page for it (that once doubled every tap).
 */
function renderCounted() {
  const commits = { count: 0 }
  render(
    <AppProvider>
      <TestRouter
        initialEntries={[{ pathname: '/practice/session', state: CONFIG }]}
      >
        <Profiler id="practice" onRender={() => commits.count++}>
          <Routes>
            <Route path="/practice/session" element={<PracticePage />} />
          </Routes>
        </Profiler>
      </TestRouter>
    </AppProvider>,
  )
  return commits
}

async function commitsDuring(
  commits: { count: number },
  action: () => Promise<void>,
) {
  const before = commits.count
  await action()
  return commits.count - before
}

describe('how often the practice page is redrawn', () => {
  it('redraws once for each thing the student does', async () => {
    const user = userEvent.setup()
    const commits = renderCounted()
    const front = () => screen.getByRole('region', { name: 'Question' })
    const firstUnchosen = () =>
      within(front()).getAllByRole('button', { pressed: false })[0]

    expect(
      await commitsDuring(commits, () => user.click(firstUnchosen())),
    ).toBe(1) // choose an answer
    expect(
      await commitsDuring(commits, () => user.click(firstUnchosen())),
    ).toBe(1) // change their mind
    expect(
      await commitsDuring(commits, () =>
        user.click(screen.getByRole('button', { name: 'Flip Card' })),
      ),
    ).toBe(1)
    expect(
      await commitsDuring(commits, () =>
        user.click(screen.getByRole('button', { name: 'I Got It Right' })),
      ),
    ).toBe(1) // the verdict, which also brings up the next question
  })

  it('redraws once for a number key press too', async () => {
    const user = userEvent.setup()
    const commits = renderCounted()
    expect(await commitsDuring(commits, () => user.keyboard('2'))).toBe(1)
  })
})
