/** Maps database / network errors to friendly messages. Raw errors are never shown to users. */
const MESSAGES: Record<string, string> = {
  SURVEY_NOT_ACTIVE: 'This survey is no longer accepting responses.',
  DUPLICATE_RESPONSE: 'You have already submitted a response to this survey.',
  INVALID_QUESTION: 'Something was wrong with your answers. Please reload the page and try again.',
  INVALID_CHOICE: 'One of your answers is no longer valid. Please reload the page and try again.',
  MISSING_REQUIRED_ANSWER: 'Please answer every question before submitting.',
  AUTH_REQUIRED: 'Please log in again.',
  SURVEY_NOT_FOUND: 'Survey not found.',
  SURVEY_ARCHIVED: 'Archived surveys cannot be activated. Duplicate it instead.',
  SURVEY_HAS_NO_QUESTIONS: 'Add at least one question before activating.',
  SURVEY_NOT_EDITABLE: 'Only draft surveys can be edited. Duplicate it to make a changeable copy.',
  TITLE_REQUIRED: 'Please enter a survey title.',
  QUESTIONS_REQUIRED: 'Add at least one question.',
  QUESTION_TEXT_REQUIRED: 'Every question needs text.',
  CHOICE_TEXT_REQUIRED: 'Every choice needs text.',
  AT_LEAST_TWO_CHOICES: 'Multiple-choice questions need at least two choices.',
  INVALID_QUESTION_TYPE: 'Unsupported question type.',
}

export class AppError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

interface MaybeSupabaseError {
  message?: string
  code?: string
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  const e = (err ?? {}) as MaybeSupabaseError
  const raw = e.message ?? ''
  for (const code of Object.keys(MESSAGES)) {
    if (raw.includes(code)) return new AppError(code, MESSAGES[code])
  }
  if (/failed to fetch|networkerror|load failed|network request/i.test(raw)) {
    return new AppError('NETWORK', 'Network error. Check your connection and try again.')
  }
  if (e.code === 'PGRST301' || /jwt/i.test(raw)) {
    return new AppError('AUTH_REQUIRED', MESSAGES.AUTH_REQUIRED)
  }
  console.error('Unexpected error', err)
  return new AppError('UNEXPECTED', 'Something went wrong. Please try again.')
}

export const errorMessage = (err: unknown) => toAppError(err).message
