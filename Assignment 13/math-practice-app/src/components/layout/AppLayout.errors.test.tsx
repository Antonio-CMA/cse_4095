import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../app/AppProvider'
import type { DataProblem } from '../../services/dataRepair'
import { reportStorageFailure } from '../../services/storageFailures'
import { AppLayout } from './AppLayout'

function Boom(): never {
  throw new Error('secret technical detail')
}

function renderLayout(path: string, dataProblems?: DataProblem[]) {
  return render(
    <AppProvider dataProblems={dataProblems}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Home page</h1>} />
            <Route path="boom" element={<Boom />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('a page that breaks', () => {
  it('shows a friendly message inside the usual frame, with no technical detail', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderLayout('/boom')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something unexpected happened',
    )
    expect(document.body.textContent).not.toMatch(/secret technical detail/)
    // The header and its menu are still there to get away with.
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('goes away when the student moves to another page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderLayout('/boom')

    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(
      screen.getByRole('heading', { name: 'Home page' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('notices above the page', () => {
  it('tells the student when saving fails', () => {
    renderLayout('/')
    expect(screen.queryByRole('status')).toBeNull()

    act(() => reportStorageFailure('quota'))
    expect(screen.getByRole('status')).toHaveTextContent(/no room left/)
    // ...above the page itself.
    expect(screen.getByRole('main').firstElementChild).toBe(
      screen.getByRole('status'),
    )
  })

  it('tells the student when saved data was repaired at startup', () => {
    renderLayout('/', [{ category: 'attempts', action: 'reset', dropped: 0 }])
    expect(screen.getByRole('status')).toHaveTextContent(
      "Your saved answers couldn't be read, so we cleared them.",
    )
  })

  it('shows both at once if both happened', () => {
    renderLayout('/', [{ category: 'settings', action: 'reset', dropped: 0 }])
    act(() => reportStorageFailure('unavailable'))
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('has no notices when all is well', () => {
    renderLayout('/')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
