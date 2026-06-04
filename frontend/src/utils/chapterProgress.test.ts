import { describe, expect, it } from 'vitest'
import { chapterWriteProgressHint, isGenericChapterProgressMessage } from './chapterProgress'
import type { AgentStepState } from '../types/agent'

describe('chapterProgress', () => {
  it('detects generic chapter progress copy', () => {
    expect(isGenericChapterProgressMessage('正在写入章节正文…')).toBe(true)
    expect(isGenericChapterProgressMessage('正在编辑《第1章》')).toBe(false)
  })

  it('prefers chapter title over generic detail', () => {
    const step: AgentStepState = {
      stepId: 's1',
      status: 'started',
      toolName: 'Edit',
      title: '《第1章 末法降临》（作品列表第1章）',
      detail: '正在写入章节正文…',
    }
    expect(chapterWriteProgressHint(step)).toContain('第1章 末法降临')
    expect(chapterWriteProgressHint(step)).not.toContain('正文')
  })
})
