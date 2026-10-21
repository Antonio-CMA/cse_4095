import { describe, expect, it } from 'vitest'
import {
  parseSetupNotice,
  SETUP_NOTICE_MESSAGES,
  setupNoticeState,
} from './setupNotice'

describe('setup notices', () => {
  it.each(['no-session', 'no-results', 'no-mistakes'] as const)(
    'carries %s to the setup page and back',
    (notice) => {
      expect(parseSetupNotice(setupNoticeState(notice))).toBe(notice)
    },
  )

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['text', 'no-session'],
    ['an object without one', { operations: ['addition'] }],
    ['an unknown one', { notice: 'on-fire' }],
    ['one that is not text', { notice: 3 }],
    ['an inherited name', { notice: 'toString' }],
  ])('finds none in %s', (_label, state) => {
    expect(parseSetupNotice(state)).toBeNull()
  })

  it('explains each one in plain words, with a way forward', () => {
    for (const message of Object.values(SETUP_NOTICE_MESSAGES)) {
      expect(message).toMatch(/Choose/)
      expect(message).not.toMatch(/undefined|null|state|error|exception/i)
    }
  })
})
