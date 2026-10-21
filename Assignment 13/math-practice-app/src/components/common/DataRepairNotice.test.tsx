import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../../app/AppProvider'
import type { DataProblem } from '../../services/dataRepair'
import { describeDataProblem } from '../../utils/dataProblemMessages'
import { DataRepairNotice } from './DataRepairNotice'

function renderNotice(problems?: DataProblem[]) {
  return render(
    <AppProvider dataProblems={problems}>
      <DataRepairNotice />
    </AppProvider>,
  )
}

describe('describeDataProblem', () => {
  it.each<[DataProblem, RegExp]>([
    [
      { category: 'settings', action: 'reset', dropped: 0 },
      /Your settings couldn't be read, so we set them back/,
    ],
    [
      { category: 'settings', action: 'repaired', dropped: 2 },
      /Some of your settings couldn't be read, so we set those back/,
    ],
    [
      { category: 'attempts', action: 'reset', dropped: 0 },
      /Your saved answers couldn't be read, so we cleared them/,
    ],
    [
      { category: 'attempts', action: 'repaired', dropped: 4 },
      /Some of your saved answers couldn't be read, so we removed those and kept the rest/,
    ],
    [
      { category: 'sessions', action: 'reset', dropped: 0 },
      /Your practice history couldn't be read/,
    ],
    [
      { category: 'mistakePatterns', action: 'repaired', dropped: 1 },
      /Some of your saved mistakes couldn't be read/,
    ],
  ])('explains %j', (problem, words) => {
    expect(describeDataProblem(problem)).toMatch(words)
  })

  it('never uses technical words', () => {
    for (const category of [
      'settings',
      'sessions',
      'attempts',
      'mistakePatterns',
    ] as const) {
      for (const action of ['reset', 'repaired'] as const) {
        expect(
          describeDataProblem({ category, action, dropped: 1 }),
        ).not.toMatch(
          /JSON|localStorage|schema|parse|attempts|mistakePatterns|null/i,
        )
      }
    }
  })
})

describe('DataRepairNotice', () => {
  it('shows nothing when no data had to be fixed', () => {
    renderNotice()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lists what was fixed, and says the rest was kept', () => {
    renderNotice([
      { category: 'attempts', action: 'reset', dropped: 0 },
      { category: 'settings', action: 'repaired', dropped: 1 },
    ])
    const notice = screen.getByRole('status')
    expect(
      within(notice).getByText('We fixed some saved data.'),
    ).toBeInTheDocument()
    expect(within(notice).getAllByRole('listitem')).toHaveLength(2)
    expect(notice).toHaveTextContent('Your saved answers couldn')
    expect(notice).toHaveTextContent('Some of your settings couldn')
    expect(notice).toHaveTextContent('Everything else was kept.')
  })

  it('can be closed', async () => {
    const user = userEvent.setup()
    renderNotice([{ category: 'sessions', action: 'reset', dropped: 0 }])

    await user.click(screen.getByRole('button', { name: 'Got It' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('is empty without an AppProvider', () => {
    render(<DataRepairNotice />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
