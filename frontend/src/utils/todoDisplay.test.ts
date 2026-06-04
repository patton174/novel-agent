import { describe, expect, it } from 'vitest'
import {
  formatTodoProgress,
  MESSAGE_TODO_MAX_VISIBLE,
  sliceTodosForDisplay,
  sortTodosForDisplay,
} from './todoDisplay'
import type { AgentTodoItem } from '../types/agent'

const t = (
  id: string,
  status: AgentTodoItem['status'],
  content = id,
): AgentTodoItem => ({ id, content, status })

describe('todoDisplay', () => {
  it('puts completed and cancelled after active todos', () => {
    const sorted = sortTodosForDisplay([
      t('c', 'completed'),
      t('p', 'pending'),
      t('a', 'in_progress'),
    ])
    expect(sorted.map((x) => x.id)).toEqual(['a', 'p', 'c'])
  })

  it('caps visible slice and reports omitted count', () => {
    const sorted = sortTodosForDisplay([
      t('1', 'pending'),
      t('2', 'pending'),
      t('3', 'pending'),
      t('4', 'pending'),
      t('5', 'completed'),
    ])
    const { visible, omitted } = sliceTodosForDisplay(
      sorted,
      MESSAGE_TODO_MAX_VISIBLE,
      MESSAGE_TODO_MAX_VISIBLE,
    )
    expect(visible).toHaveLength(3)
    expect(omitted).toBe(2)
  })

  it('formats completed progress label', () => {
    expect(
      formatTodoProgress([
        t('1', 'completed'),
        t('2', 'pending'),
        t('3', 'in_progress'),
      ]),
    ).toBe('1/3 已完成')
  })
})
