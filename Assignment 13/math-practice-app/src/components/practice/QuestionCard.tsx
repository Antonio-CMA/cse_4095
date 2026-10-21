import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnswerShortcuts } from '../../hooks/useAnswerShortcuts'
import type { Question } from '../../types/question'
import { speakSolution } from '../../utils/speech'
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
  /** Let the number keys 1–4 choose an answer. Turn off while a dialog is open. */
  shortcutsEnabled?: boolean
  /**
   * Move keyboard focus to the card when it appears. A question that replaces
   * an answered one needs this: the card the student was using has just gone,
   * so focus would otherwise fall back to the top of the page.
   */
  focusOnShow?: boolean
  /** Start with this answer picked and/or the card turned (after a refresh). */
  initialProgress?: { selectedAnswer: number | null; flipped: boolean }
  /** Told whenever the picked answer or the side showing changes. */
  onProgressChange?: (progress: {
    selectedAnswer: number | null
    flipped: boolean
  }) => void
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
  shortcutsEnabled = true,
  focusOnShow = false,
  initialProgress,
  onProgressChange,
  onResult,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(
    initialProgress?.selectedAnswer ?? null,
  )
  const [isFlipped, setIsFlipped] = useState(initialProgress?.flipped ?? false)
  const [resultRecorded, setResultRecorded] = useState(false)
  // Spoken aloud by screen readers (it is not shown on screen).
  const [announcement, setAnnouncement] = useState('')
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  // Each question gets its own card, so this happens once per question. (A card
  // that starts turned over focuses its back instead, below.)
  const [focusFrontOnShow] = useState(focusOnShow && !initialProgress?.flipped)
  useEffect(() => {
    if (focusFrontOnShow) frontRef.current?.focus()
  }, [focusFrontOnShow])

  useEffect(() => {
    onProgressChange?.({ selectedAnswer, flipped: isFlipped })
  }, [selectedAnswer, isFlipped, onProgressChange])

  // The front's controls stop being available after the flip, so move focus to
  // the back rather than leaving keyboard users stranded.
  useEffect(() => {
    if (isFlipped) backRef.current?.focus()
  }, [isFlipped])

  const selectAnswer = useCallback((answer: number) => {
    setSelectedAnswer(answer)
    setAnnouncement(`Selected ${answer}.`)
  }, [])

  // The number keys choose an answer, until the card is flipped.
  const selectByPosition = useCallback(
    (index: number) => selectAnswer(question.choices[index]),
    [question.choices, selectAnswer],
  )
  useAnswerShortcuts({
    enabled: shortcutsEnabled && !isFlipped && !resultRecorded,
    count: question.choices.length,
    onSelect: selectByPosition,
  })

  const flip = () => {
    setIsFlipped(true)
    setAnnouncement(
      `Answer revealed. ${speakSolution(question)}. You chose ${selectedAnswer}.`,
    )
  }

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
      <div
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <div className="flip-card__inner">
        <section
          ref={frontRef}
          className="flip-card__face flip-card__face--front"
          aria-label="Question"
          aria-hidden={isFlipped}
          inert={isFlipped}
          tabIndex={-1}
        >
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            locked={isFlipped}
            showShortcuts={shortcutsEnabled}
            onSelectAnswer={selectAnswer}
            onFlip={flip}
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
