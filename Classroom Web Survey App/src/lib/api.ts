import { supabase } from './supabase'
import { toAppError } from './errors'
import type {
  DraftQuestion,
  Question,
  Survey,
  SurveyResults,
  SurveyStatus,
  SurveyWithQuestions,
} from './types'
import type { ExportRow } from './csv'

/** Throws a friendly AppError if the Supabase call failed. */
function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw toAppError(res.error)
  return res.data as T
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

function sortQuestions(raw: Question[]): Question[] {
  return [...raw]
    .sort(byPosition)
    .map((q) => ({ ...q, choices: [...(q.choices ?? [])].sort(byPosition) }))
}

// ---------------------------------------------------------------- instructor

export type SurveyListItem = Survey & { response_count: number }

export async function listSurveys(): Promise<SurveyListItem[]> {
  const res = await supabase
    .from('surveys')
    .select('*, responses(count)')
    .order('created_at', { ascending: false })
  const rows = unwrap(res) as (Survey & { responses: { count: number }[] })[]
  return rows.map(({ responses, ...s }) => ({ ...s, response_count: responses?.[0]?.count ?? 0 }))
}

export async function getSurvey(id: string): Promise<SurveyWithQuestions> {
  const res = await supabase
    .from('surveys')
    .select('*, questions(*, choices(*))')
    .eq('id', id)
    .maybeSingle()
  const row = unwrap(res) as SurveyWithQuestions | null
  if (!row) throw toAppError({ message: 'SURVEY_NOT_FOUND' })
  return { ...row, questions: sortQuestions(row.questions ?? []) }
}

export async function saveSurvey(
  id: string | null,
  title: string,
  description: string,
  questions: DraftQuestion[],
): Promise<string> {
  const payload = questions.map((q) => ({
    question_text: q.question_text,
    question_type: q.question_type,
    choices: q.question_type === 'true_false' ? [] : q.choices.map((c) => c.text),
  }))
  const res = await supabase.rpc('save_survey', {
    p_survey_id: id,
    p_title: title,
    p_description: description,
    p_questions: payload,
  })
  return unwrap(res) as string
}

export async function activateSurvey(id: string): Promise<{ id: string; public_slug: string }> {
  const res = await supabase.rpc('activate_survey', { p_survey_id: id })
  return unwrap(res) as { id: string; public_slug: string }
}

export async function closeSurvey(id: string): Promise<void> {
  unwrap(await supabase.rpc('close_survey', { p_survey_id: id }))
}

export async function setSurveyStatus(id: string, status: SurveyStatus): Promise<void> {
  unwrap(await supabase.from('surveys').update({ status }).eq('id', id))
}

export async function deleteSurvey(id: string): Promise<void> {
  unwrap(await supabase.from('surveys').delete().eq('id', id))
}

export async function duplicateSurvey(id: string): Promise<string> {
  return unwrap(await supabase.rpc('duplicate_survey', { p_survey_id: id })) as string
}

export async function getResults(id: string): Promise<SurveyResults> {
  return unwrap(await supabase.rpc('get_survey_results', { p_survey_id: id })) as SurveyResults
}

export async function getResponseCount(id: string): Promise<number> {
  const res = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', id)
  if (res.error) throw toAppError(res.error)
  return res.count ?? 0
}

/** Fetch every response (paged past PostgREST's 1000-row cap) shaped for CSV export. */
export async function fetchExportRows(survey: SurveyWithQuestions): Promise<ExportRow[]> {
  const choiceText = new Map<string, string>()
  survey.questions.forEach((q) => q.choices.forEach((c) => choiceText.set(c.id, c.choice_text)))

  const rows: ExportRow[] = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const res = await supabase
      .from('responses')
      .select('id, submitted_at, answers(question_id, choice_id)')
      .eq('survey_id', survey.id)
      .order('submitted_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    const page = unwrap(res) as {
      id: string
      submitted_at: string
      answers: { question_id: string; choice_id: string | null }[]
    }[]
    for (const r of page) {
      const answers: Record<string, string> = {}
      for (const a of r.answers) {
        if (a.choice_id) answers[a.question_id] = choiceText.get(a.choice_id) ?? ''
      }
      rows.push({ response_id: r.id, submitted_at: r.submitted_at, answers })
    }
    if (page.length < pageSize) break
  }
  return rows
}

// ------------------------------------------------------------------- student

export type PublicSurveyResult =
  { kind: 'active'; survey: SurveyWithQuestions } | { kind: 'closed' } | { kind: 'not_found' }

export async function getPublicSurvey(slug: string): Promise<PublicSurveyResult> {
  // Anonymous RLS only exposes ACTIVE surveys.
  const res = await supabase
    .from('surveys')
    .select('*, questions(*, choices(*))')
    .eq('public_slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  const row = unwrap(res) as SurveyWithQuestions | null
  if (row)
    return { kind: 'active', survey: { ...row, questions: sortQuestions(row.questions ?? []) } }

  const status = unwrap(await supabase.rpc('survey_public_status', { p_slug: slug })) as
    string | null
  return status && status !== 'draft' ? { kind: 'closed' } : { kind: 'not_found' }
}

export async function submitResponse(
  surveyId: string,
  token: string,
  answers: { question_id: string; choice_id: string }[],
): Promise<string> {
  const res = await supabase.rpc('submit_survey_response', {
    p_survey_id: surveyId,
    p_anonymous_token: token,
    p_answers: answers,
  })
  const out = unwrap(res) as { success: boolean; response_id: string }
  return out.response_id
}

/** Public base URL used in QR codes; override with VITE_PUBLIC_BASE_URL if needed. */
export function publicSurveyUrl(slug: string): string {
  const base =
    (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
    window.location.origin
  return `${base}/s/${slug}`
}
