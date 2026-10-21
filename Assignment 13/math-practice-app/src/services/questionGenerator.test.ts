import { afterEach, describe, expect, it, vi } from 'vitest'
import { seededRng } from '../test/rng'
import type {
  DifficultyLevel,
  MathOperation,
  QuestionDraft,
} from '../types/question'
import { isValidQuestionDraft } from '../utils/validation'
import { OPERATION_GENERATORS } from './operationGenerators'
import {
  generateQuestionDraft,
  generateRandomQuestionDraft,
  QuestionGenerationError,
} from './questionGenerator'

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateQuestionDraft', () => {
  it.each(
    OPERATIONS.flatMap((op) => LEVELS.map((level) => [op, level] as const)),
  )('makes valid %s questions at level %i', (operation, level) => {
    const rng = seededRng(level)
    for (let i = 0; i < 200; i++) {
      const q = generateQuestionDraft(operation, level, rng)
      expect(q.operation).toBe(operation)
      expect(q.difficulty).toBe(level)
      expect(isValidQuestionDraft(q)).toBe(true)
    }
  })

  it('retries when a generated question fails validation', () => {
    const bad: QuestionDraft = {
      id: 'bad',
      operation: 'addition',
      firstOperand: 1,
      secondOperand: 1,
      displayText: '1 + 1 = ?',
      correctAnswer: 99,
      difficulty: 1,
      source: 'regular',
    }
    const good = OPERATION_GENERATORS.addition
    const spy = vi
      .spyOn(OPERATION_GENERATORS, 'addition')
      .mockReturnValueOnce(bad)
      .mockReturnValueOnce(bad)
      .mockImplementation(good)

    const q = generateQuestionDraft('addition', 1)
    expect(isValidQuestionDraft(q)).toBe(true)
    expect(q.id).not.toBe('bad')
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('gives up with a clear error after repeated invalid questions', () => {
    const bad: QuestionDraft = {
      id: 'bad',
      operation: 'division',
      firstOperand: 5,
      secondOperand: 0,
      displayText: '5 ÷ 0 = ?',
      correctAnswer: 0,
      difficulty: 1,
      source: 'regular',
    }
    const spy = vi.spyOn(OPERATION_GENERATORS, 'division').mockReturnValue(bad)

    expect(() => generateQuestionDraft('division', 1)).toThrow(
      QuestionGenerationError,
    )
    expect(() => generateQuestionDraft('division', 1)).toThrow(
      /Division by zero/,
    )
    expect(spy).toHaveBeenCalledTimes(10)
  })

  it('rejects an unsupported operation', () => {
    expect(() =>
      generateQuestionDraft('modulo' as unknown as MathOperation, 1),
    ).toThrow(QuestionGenerationError)
  })
})

describe('generateRandomQuestionDraft', () => {
  it('only uses the enabled operations and eventually uses each', () => {
    const rng = seededRng(42)
    const seen = new Set<MathOperation>()
    for (let i = 0; i < 300; i++) {
      seen.add(
        generateRandomQuestionDraft(['multiplication', 'division'], 2, rng)
          .operation,
      )
    }
    expect([...seen].sort()).toEqual(['division', 'multiplication'])
  })

  it('works with a single operation', () => {
    expect(generateRandomQuestionDraft(['addition'], 1).operation).toBe(
      'addition',
    )
  })

  it('throws when no operation is enabled', () => {
    expect(() => generateRandomQuestionDraft([], 1)).toThrow(
      QuestionGenerationError,
    )
  })
})
