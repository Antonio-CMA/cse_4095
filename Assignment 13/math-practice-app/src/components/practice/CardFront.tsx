import type { Question } from '../../types/question'
import { Button } from '../common/Button'
import { AnswerChoice } from './AnswerChoice'

interface CardFrontProps {
  question: Question
  questionNumber: number
  /** null for continuous practice, which has no fixed length. */
  totalQuestions: number | null
  selectedAnswer: number | null
  /** True once the card has been flipped: answers can no longer change. */
  locked: boolean
  onSelectAnswer: (answer: number) => void
  onFlip: () => void
}

export function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  locked,
  onSelectAnswer,
  onFlip,
}: CardFrontProps) {
  return (
    <>
      <p className="card__meta">
        {totalQuestions === null
          ? `Question ${questionNumber}`
          : `Question ${questionNumber} of ${totalQuestions}`}
      </p>
      <h2 className="card__problem">{question.displayText}</h2>
      <div className="answer-grid" role="group" aria-label="Answer choices">
        {question.choices.map((choice) => (
          <AnswerChoice
            key={choice}
            value={choice}
            selected={selectedAnswer === choice}
            disabled={locked}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>
      <Button
        className="card__action"
        disabled={locked || selectedAnswer === null}
        onClick={onFlip}
      >
        Flip Card
      </Button>
      {selectedAnswer === null && !locked && (
        <p className="card__hint">Pick an answer, then flip the card.</p>
      )}
    </>
  )
}
