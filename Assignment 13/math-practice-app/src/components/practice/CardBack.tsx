import type { Question } from '../../types/question'
import { formatSolution } from '../../utils/questionText'
import { Button } from '../common/Button'

interface CardBackProps {
  question: Question
  selectedAnswer: number | null
  /** True once a verdict has been given; the buttons then stay disabled. */
  resultRecorded: boolean
  onResult: (correct: boolean) => void
}

export function CardBack({
  question,
  selectedAnswer,
  resultRecorded,
  onResult,
}: CardBackProps) {
  return (
    <>
      <p className="card__meta">The answer is…</p>
      <h2 className="card__problem">{formatSolution(question)}</h2>
      <dl className="card__answers">
        <div>
          <dt>Correct answer</dt>
          <dd>{question.correctAnswer}</dd>
        </div>
        <div>
          <dt>Your answer</dt>
          <dd>{selectedAnswer}</dd>
        </div>
      </dl>
      <p className="card__prompt">Did you get it right?</p>
      <div className="card__verdict">
        <Button disabled={resultRecorded} onClick={() => onResult(true)}>
          I Got It Right
        </Button>
        <Button
          variant="secondary"
          disabled={resultRecorded}
          onClick={() => onResult(false)}
        >
          I Got It Wrong
        </Button>
      </div>
    </>
  )
}
