import type { DifficultyLevel, MathOperation } from '../types/question'
import type { SessionLength } from '../types/session'

export const OPERATION_OPTIONS: ReadonlyArray<{
  value: MathOperation
  label: string
  symbol: string
}> = [
  { value: 'addition', label: 'Addition', symbol: '+' },
  { value: 'subtraction', label: 'Subtraction', symbol: '−' },
  { value: 'multiplication', label: 'Multiplication', symbol: '×' },
  { value: 'division', label: 'Division', symbol: '÷' },
]

export const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: DifficultyLevel
  label: string
  description: string
}> = [
  {
    value: 1,
    label: 'Beginner',
    description: 'Small numbers up to 10. Great for getting started.',
  },
  {
    value: 2,
    label: 'Easy',
    description: 'Numbers up to 50 and times tables up to 10.',
  },
  {
    value: 3,
    label: 'Intermediate',
    description: 'Numbers up to 100, with carrying and borrowing.',
  },
  {
    value: 4,
    label: 'Advanced',
    description: 'Numbers up to 1,000 and bigger multiplication.',
  },
]

export const SESSION_LENGTH_OPTIONS: ReadonlyArray<{
  value: SessionLength
  label: string
}> = [
  { value: 5, label: '5 questions' },
  { value: 10, label: '10 questions' },
  { value: 20, label: '20 questions' },
  { value: 'continuous', label: 'Continuous practice' },
]

export const DEFAULT_DIFFICULTY: DifficultyLevel = 1
export const DEFAULT_SESSION_LENGTH: SessionLength = 10
