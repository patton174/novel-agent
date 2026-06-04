import { describe, expect, it } from 'vitest'
import {
  ccToolArgsSubtitle,
  ccToolHumanSubtitle,
  ccToolNameLabel,
  ccToolResultHint,
} from './ccToolDisplay'
import type { AgentStepState } from '../types/agent'

describe('ccToolDisplay', () => {
  it('humanizes glob on novel root without uuid', () => {
    expect(
      ccToolHumanSubtitle('Glob', {
        path: '/novel/d071d83d-a058-441b-ab67-847131d3c69a',
      }),
    ).toBe('本书目录')
  })

  it('humanizes read chapter path', () => {
    expect(
      ccToolHumanSubtitle('Read', {
        path: '/novel/uuid/chapters/0ec4bbd8-5353-407e-97ce-018613acda18.md',
      }),
    ).toBe('章节正文')
  })

  it('uses result labels on step', () => {
    const step: AgentStepState = {
      stepId: 's1',
      type: 'tool',
      status: 'completed',
      title: '查阅创作记忆',
      toolName: 'Read',
      resultLabels: ['张三', '李四'],
    }
    expect(ccToolArgsSubtitle(step)).toBe('')
    expect(ccToolNameLabel(step)).toBe('查阅创作记忆')
    expect(
      ccToolResultHint(step, {
        readLabel: '张三、李四',
        loading: false,
      }),
    ).toBe('张三、李四')
  })

  it('name label uses chapter path when title is generic', () => {
    const step: AgentStepState = {
      stepId: 's1b',
      type: 'tool',
      status: 'completed',
      title: '读取',
      toolName: 'Read',
      toolInput: {
        file_path:
          '/novel/uuid/chapters/0ec4bbd8-5353-407e-97ce-018613acda18.md',
      },
    }
    expect(ccToolNameLabel(step)).toBe('阅读章节')
  })

  it('todo write does not repeat Todos updated status line', () => {
    const step: AgentStepState = {
      stepId: 'todo-1',
      type: 'tool',
      status: 'completed',
      title: '任务',
      toolName: 'TodoWrite',
      outputSummary: 'Todos updated.',
      todos: [
        { id: 'a', content: '写第一章', status: 'pending' },
        { id: 'b', content: '校对', status: 'pending' },
      ],
    }
    expect(ccToolHumanSubtitle('TodoWrite', { outputSummary: 'Todos updated.' })).toBe('')
    expect(ccToolArgsSubtitle(step)).toBe('2 项')
  })

  it('does not expose raw novel id in args', () => {
    const step: AgentStepState = {
      stepId: 's2',
      type: 'tool',
      status: 'completed',
      title: '列举',
      toolName: 'Glob',
      toolArgs: 'd071d83d-a058-441b-ab67-847131d3c69a',
    }
    expect(ccToolArgsSubtitle(step)).not.toContain('d071d83d')
  })
})
