import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../../types/question'
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

const NEXT_QUESTION: Question = {
  id: 'q2',
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  displayText: '2 + 3 = ?',
  correctAnswer: 5,
  choices: [4, 5, 6, 7],
  difficulty: 1,
  source: 'regular',
}

function renderCard(props: Partial<ComponentProps<typeof QuestionCard>> = {}) {
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

const flipButton = () => screen.getByRole('button', { name: 'Flip Card' })

describe('QuestionCard front', () => {
  it('shows the question, four answers and the question number', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: '7 × 8 = ?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
    for (const choice of ['48', '54', '56', '64']) {
      expect(screen.getByRole('button', { name: choice })).toBeInTheDocument()
    }
  })

  it('leaves out the total for continuous practice', () => {
    renderCard({ totalQuestions: null })
    expect(screen.getByText('Question 3')).toBeInTheDocument()
  })

  it('keeps Flip Card disabled until an answer is selected', async () => {
    const user = userEvent.setup()
    renderCard()

    expect(flipButton()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '54' }))
    expect(flipButton()).toBeEnabled()
  })

  it('highlights the selected answer and lets it be changed before flipping', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: '54' }))
    expect(screen.getByRole('button', { name: '54' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: '64' }))
    expect(screen.getByRole('button', { name: '64' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '54' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})

describe('QuestionCard flipping', () => {
  async function flipAfterChoosing(answer: string) {
    const user = userEvent.setup()
    const utils = renderCard()
    await user.click(screen.getByRole('button', { name: answer }))
    await user.click(flipButton())
    return { user, ...utils }
  }

  it('shows the solution, correct answer and the student answer on the back', async () => {
    await flipAfterChoosing('54')

    expect(
      screen.getByRole('heading', { name: '7 × 8 = 56' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Correct answer').nextSibling).toHaveTextContent(
      '56',
    )
    expect(screen.getByText('Your answer').nextSibling).toHaveTextContent('54')
    expect(
      screen.getByRole('button', { name: 'I Got It Right' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'I Got It Wrong' }),
    ).toBeInTheDocument()
  })

  it('hides the front and locks answers once flipped', async () => {
    await flipAfterChoosing('54')

    expect(
      screen.queryByRole('button', { name: 'Flip Card' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '48' })).not.toBeInTheDocument()
  })

  it('hides the back before flipping', () => {
    renderCard()
    expect(
      screen.queryByRole('button', { name: 'I Got It Right' }),
    ).not.toBeInTheDocument()
  })

  it('moves keyboard focus to the back after flipping', async () => {
    await flipAfterChoosing('54')
    expect(document.activeElement).toBe(
      document.querySelector('.flip-card__face--back'),
    )
  })

  it('works without animation', async () => {
    const user = userEvent.setup()
    const { container } = renderCard({ animationEnabled: false })

    expect(container.firstElementChild).toHaveClass('flip-card--static')
    await user.click(screen.getByRole('button', { name: '56' }))
    await user.click(flipButton())
    expect(
      screen.getByRole('heading', { name: '7 × 8 = 56' }),
    ).toBeInTheDocument()
  })

  it('uses the animated flip by default', () => {
    const { container } = renderCard()
    expect(container.firstElementChild).not.toHaveClass('flip-card--static')
  })
})

describe('QuestionCard result', () => {
  it('reports "right" with the selected answer', async () => {
    const user = userEvent.setup()
    const { onResult } = renderCard()
    await user.click(screen.getByRole('button', { name: '56' }))
    await user.click(flipButton())
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({ selectedAnswer: 56, correct: true })
  })

  it('reports "wrong" with the selected answer', async () => {
    const user = userEvent.setup()
    const { onResult } = renderCard()
    await user.click(screen.getByRole('button', { name: '48' }))
    await user.click(flipButton())
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))

    expect(onResult).toHaveBeenCalledWith({
      selectedAnswer: 48,
      correct: false,
    })
  })

  it('only lets one verdict be recorded per attempt', async () => {
    const user = userEvent.setup()
    const { onResult } = renderCard()
    await user.click(screen.getByRole('button', { name: '56' }))
    await user.click(flipButton())
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))

    expect(
      screen.getByRole('button', { name: 'I Got It Right' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'I Got It Wrong' }),
    ).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
    expect(onResult).toHaveBeenCalledTimes(1)
  })
})

describe('QuestionCard with a new question', () => {
  it('starts fresh: unflipped with nothing selected', async () => {
    const user = userEvent.setup()
    const { rerender, onResult } = renderCard()
    await user.click(screen.getByRole('button', { name: '56' }))
    await user.click(flipButton())

    rerender(
      <QuestionCard
        question={NEXT_QUESTION}
        questionNumber={4}
        totalQuestions={10}
        onResult={onResult}
      />,
    )

    expect(
      screen.getByRole('heading', { name: '2 + 3 = ?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 4 of 10')).toBeInTheDocument()
    expect(flipButton()).toBeDisabled()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'I Got It Right' })).toBeNull()
  })
})
