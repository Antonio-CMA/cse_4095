export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'
export type QuestionType = 'multiple_choice' | 'true_false'

export interface Survey {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
}

export interface Choice {
  id: string
  question_id: string
  choice_text: string
  position: number
}

export interface Question {
  id: string
  survey_id: string
  question_text: string
  question_type: QuestionType
  position: number
  choices: Choice[]
}

export interface SurveyWithQuestions extends Survey {
  questions: Question[]
}

/** Editor-side question; `key` is a client-only stable id for React lists. */
export interface DraftQuestion {
  key: string
  question_text: string
  question_type: QuestionType
  choices: { key: string; text: string }[]
}

export interface ResultChoice {
  choice_id: string
  choice_text: string
  count: number
  percentage: number
}

export interface ResultQuestion {
  question_id: string
  question_text: string
  question_type: QuestionType
  position: number
  response_count: number
  choices: ResultChoice[]
}

export interface SurveyResults {
  survey_id: string
  response_count: number
  questions: ResultQuestion[]
}
