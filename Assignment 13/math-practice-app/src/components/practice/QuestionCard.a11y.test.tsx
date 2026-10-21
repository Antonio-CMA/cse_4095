import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../../types/question'
import { AnswerChoice } from './AnswerChoice'
import { QuestionCard } from './QuestionCard'

const QUESTION: Question = {
  id: 'q1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

function renderCard(props = {}) {
  const onResult = vi.fn()
  const utils = render(
    <QuestionCard
      question={QUESTION}
      questionNumber={3}
      totalQuestions={10}
      onResult={onResult}
      {...props}
    />,
  )
  return { onResult, ...utils }
}

const pressed = () => screen.queryAllByRole('button', { pressed: true })
const announcement = () => screen.getByRole('status').textContent

describe('AnswerChoice keyboard hint', () => {
  it('shows the key on the button and tells assistive technology about it', () => {
    render(
      <AnswerChoice
        value={56}
        selected={false}
        shortcut={3}
        onSelect={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: '56' })
    expect(button).toHaveAttribute('aria-keyshortcuts', '3')
    expect(button).toHaveTextContent('3')
  })

  it('keeps the key out of the button’s spoken name', () => {
    render(
      <AnswerChoice
        value={56}
        selected={false}
        shortcut={3}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '56' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '356' })).toBeNull()
  })

  it('has no hint without a shortcut', () => {
    render(<AnswerChoice value={56} selected={false} onSelect={() => {}} />)
    const button = screen.getByRole('button', { name: '56' })
    expect(button).not.toHaveAttribute('aria-keyshortcuts')
    expect(button.querySelector('.answer-choice__key')).toBeNull()
  })
})

describe('QuestionCard number keys', () => {
  it('shows keys 1 to 4 on the answers, in order', () => {
    renderCard()
    const front = screen.getByRole('region', { name: 'Question' })
    const keys = within(front)
      .getAllByRole('button', { pressed: false })
      .map((b) => b.getAttribute('aria-keyshortcuts'))
    expect(keys).toEqual(['1', '2', '3', '4'])
  })

  it('chooses the matching answer when a number key is pressed', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.keyboard('3')
    expect(pressed()).toHaveLength(1)
    expect(pressed()[0]).toHaveAccessibleName('56')
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
  })

  it('lets the choice be changed with another key', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.keyboard('1')
    await user.keyboard('4')
    expect(pressed()).toHaveLength(1)
    expect(pressed()[0]).toHaveAccessibleName('64')
  })

  it('works together with the mouse', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: '48' }))
    await user.keyboard('2')
    expect(pressed()[0]).toHaveAccessibleName('54')
  })

  it('ignores the keys once the card has been flipped', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.keyboard('2')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.keyboard('4')

    // The answer stays what it was when the card was flipped.
    expect(
      screen.getByText('Your answer').nextElementSibling,
    ).toHaveTextContent('54')
  })

  it('stops working after the verdict is given', async () => {
    const user = userEvent.setup()
    const { onResult } = renderCard()

    await user.keyboard('3')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    await user.keyboard('1')

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({ selectedAnswer: 56, correct: true })
  })

  it('can be turned off, for example while a dialog is open', async () => {
    const user = userEvent.setup()
    renderCard({ shortcutsEnabled: false })

    await user.keyboard('2')
    expect(pressed()).toHaveLength(0)

    const front = screen.getByRole('region', { name: 'Question' })
    for (const button of within(front).getAllByRole('button', {
      pressed: false,
    })) {
      expect(button).not.toHaveAttribute('aria-keyshortcuts')
    }
    expect(screen.queryByText(/press the keys 1 to 4/)).toBeNull()
  })

  it('mentions the keys in the hint', () => {
    renderCard()
    expect(screen.getByText(/press the keys 1 to 4/)).toBeInTheDocument()
  })

  it('does not choose anything for a key with no matching answer', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.keyboard('5')
    await user.keyboard('0')
    expect(pressed()).toHaveLength(0)
  })

  it('a new question starts with nothing chosen and the keys working again', async () => {
    const user = userEvent.setup()
    const { rerender, onResult } = renderCard()
    await user.keyboard('1')

    rerender(
      <QuestionCard
        question={{
          ...QUESTION,
          id: 'q2',
          choices: [4, 5, 6, 7],
          correctAnswer: 5,
        }}
        questionNumber={4}
        totalQuestions={10}
        onResult={onResult}
      />,
    )
    expect(pressed()).toHaveLength(0)

    await user.keyboard('2')
    expect(pressed()[0]).toHaveAccessibleName('5')
  })
})

describe('QuestionCard announcements for screen readers', () => {
  it('has a polite, always-present live region that starts empty', () => {
    renderCard()
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toBeEmptyDOMElement()
  })

  it('announces the chosen answer', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: '54' }))
    expect(announcement()).toBe('Selected 54.')

    await user.keyboard('3')
    expect(announcement()).toBe('Selected 56.')
  })

  it('announces the revealed answer in plain words', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: '54' }))
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))

    expect(announcement()).toBe(
      'Answer revealed. 7 times 8 equals 56. You chose 54.',
    )
  })

  it('keeps the live region visible to screen readers after the flip', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))

    // The hidden front face must not hide the announcement.
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('hides the announcement from the screen (it is for screen readers only)', () => {
    renderCard()
    expect(screen.getByRole('status')).toHaveClass('visually-hidden')
  })

  it('moves focus to the answer side after flipping, so it is read out', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.keyboard('2')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))

    const back = screen.getByRole('region', { name: 'Answer' })
    expect(back).toHaveFocus()
  })
})

describe('QuestionCard semantics', () => {
  it('labels the two sides of the card', () => {
    renderCard()
    expect(screen.getByRole('region', { name: 'Question' })).toBeInTheDocument()
  })

  it('groups the answers under a label', () => {
    renderCard()
    expect(
      screen.getByRole('group', { name: 'Answer choices' }),
    ).toBeInTheDocument()
  })

  it('hides the side that is not showing from assistive technology', async () => {
    const user = userEvent.setup()
    const { container } = renderCard()
    const faces = container.querySelectorAll('.flip-card__face')
    expect(faces[0]).toHaveAttribute('aria-hidden', 'false')
    expect(faces[1]).toHaveAttribute('aria-hidden', 'true')

    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(faces[0]).toHaveAttribute('aria-hidden', 'true')
    expect(faces[1]).toHaveAttribute('aria-hidden', 'false')
  })
})
