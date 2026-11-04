const KEY = 'classroom-survey:anonymous-token'
const SUBMITTED_PREFIX = 'classroom-survey:submitted:'

/** Random per-browser token used for duplicate-submission protection (not an identity). */
export function getAnonymousToken(): string {
  try {
    let token = localStorage.getItem(KEY)
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem(KEY, token)
    }
    return token
  } catch {
    // localStorage blocked (private mode): fall back to a per-page token
    return crypto.randomUUID()
  }
}

export function markSubmitted(surveyId: string) {
  try {
    localStorage.setItem(SUBMITTED_PREFIX + surveyId, '1')
  } catch {
    /* ignore */
  }
}

export function hasSubmitted(surveyId: string): boolean {
  try {
    return localStorage.getItem(SUBMITTED_PREFIX + surveyId) === '1'
  } catch {
    return false
  }
}
