import { useEffect, useRef, useState } from 'react'
import type { Question } from '../../types/question'
import { CardBack } from './CardBack'
import { CardFront } from './CardFront'

export interface CardResult {
  selectedAnswer: number
  /** What the student said about their own answer. */
  correct: boolean
}

interface QuestionCardProps {
  question: Question
  questionNumber: number
  /** null for continuous practice. */
  totalQuestions: number | null
  /** Turn the 3D flip animation off; the card still switches sides. */
  animationEnabled?: boolean
  /** Explain the answer on the back when the chosen answer was wrong. */
  showExplanation?: boolean
  onResult: (result: CardResult) => void
}

/**
 * A flip card for one question. Pick an answer, flip the card to see the
 * solution, then say whether you got it right. A new question always starts
 * fresh: unflipped, with nothing selected.
 */
export function QuestionCard(props: QuestionCardProps) {
  return <CardState key={props.question.id} {...props} />
}

function CardState({
  question,
  questionNumber,
  totalQuestions,
  animationEnabled = true,
  showExplanation = false,
  onResult,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [resultRecorded, setResultRecorded] = useState(false)
  const backRef = useRef<HTMLDivElement>(null)

  // The front's controls stop being available after the flip, so move focus to
  // the back rather than leaving keyboard users stranded.
  useEffect(() => {
    if (isFlipped) backRef.current?.focus()
  }, [isFlipped])

  const handleResult = (correct: boolean) => {
    if (resultRecorded || selectedAnswer === null) return
    setResultRecorded(true)
    onResult({ selectedAnswer, correct })
  }

  const classes = [
    'flip-card',
    isFlipped && 'flip-card--flipped',
    !animationEnabled && 'flip-card--static',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="flip-card__inner">
        <section
          className="flip-card__face flip-card__face--front"
          aria-label="Question"
          aria-hidden={isFlipped}
          inert={isFlipped}
        >
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            locked={isFlipped}
            onSelectAnswer={setSelectedAnswer}
            onFlip={() => setIsFlipped(true)}
          />
        </section>
        <section
          ref={backRef}
          className="flip-card__face flip-card__face--back"
          aria-label="Answer"
          aria-hidden={!isFlipped}
          inert={!isFlipped}
          tabIndex={-1}
        >
          <CardBack
            question={question}
            selectedAnswer={selectedAnswer}
            resultRecorded={resultRecorded}
            showExplanation={showExplanation}
            onResult={handleResult}
          />
        </section>
      </div>
    </div>
  )
}
