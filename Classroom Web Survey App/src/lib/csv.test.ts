import { describe, expect, it } from 'vitest'
import { buildCsv, csvField } from './csv'
import type { SurveyWithQuestions } from './types'

describe('csvField', () => {
  it('passes plain text through', () => expect(csvField('hello')).toBe('hello'))
  it('quotes commas, quotes and newlines', () => {
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('a\nb')).toBe('"a\nb"')
  })
  it('neutralises formula injection', () => expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)"))
  it('handles null', () => expect(csvField(null)).toBe(''))
})

describe('buildCsv', () => {
  it('writes metadata, header and one row per response', () => {
    const survey = {
      id: 's',
      title: 'T, 1',
      status: 'closed',
      created_at: '2026-01-01',
      questions: [{ id: 'q1', question_text: 'Q1?' }],
    } as unknown as SurveyWithQuestions
    const csv = buildCsv(survey, [
      { response_id: 'r1', submitted_at: 't1', answers: { q1: 'Yes' } },
      { response_id: 'r2', submitted_at: 't2', answers: {} },
    ])
    expect(csv).toContain('survey_title,"T, 1"')
    expect(csv).toContain('response_id,submitted_at,Q1?')
    expect(csv).toContain('r1,t1,Yes')
    expect(csv).toContain('r2,t2,\r\n')
  })
})
