import type { SurveyWithQuestions } from './types'

/** Escape one CSV field. Also neutralises spreadsheet formula injection (=, +, -, @). */
export function csvField(value: string | number | null | undefined): string {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export interface ExportRow {
  response_id: string
  submitted_at: string
  answers: Record<string, string> // question_id -> choice text
}

const line = (cells: (string | number | null | undefined)[]) => cells.map(csvField).join(',')

/** Metadata block, a blank line, then header + one row per response. */
export function buildCsv(survey: SurveyWithQuestions, rows: ExportRow[]): string {
  const lines: string[] = [
    line(['survey_title', survey.title]),
    line(['survey_status', survey.status]),
    line(['survey_created_at', survey.created_at]),
    line(['total_responses', rows.length]),
    '',
    line(['response_id', 'submitted_at', ...survey.questions.map((q) => q.question_text)]),
  ]
  for (const r of rows) {
    lines.push(
      line([r.response_id, r.submitted_at, ...survey.questions.map((q) => r.answers[q.id] ?? '')]),
    )
  }
  return lines.join('\r\n') + '\r\n'
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['﻿', text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const safeFilename = (s: string) =>
  s
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'survey'
