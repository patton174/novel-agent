import { describe, expect, it } from 'vitest'
import {
  buildSessionTitleFallback,
  isBoilerplateSessionTitle,
  sanitizeAssistantSnippetForTitle,
  sessionNeedsGeneratedTitle,
} from './sessionTitle'

describe('sessionNeedsGeneratedTitle', () => {
  it('treats placeholders as needing generation', () => {
    expect(sessionNeedsGeneratedTitle('新对话')).toBe(true)
    expect(sessionNeedsGeneratedTitle('')).toBe(true)
    expect(sessionNeedsGeneratedTitle('生成标题…')).toBe(true)
  })

  it('skips real titles', () => {
    expect(sessionNeedsGeneratedTitle('续写第十二章')).toBe(false)
    expect(sessionNeedsGeneratedTitle('角色卡校对')).toBe(false)
  })

  it('treats boilerplate titles as needing regeneration', () => {
    expect(sessionNeedsGeneratedTitle('我整理好了上下文，但本次没有生成可展示正文')).toBe(true)
  })
})

describe('sanitizeAssistantSnippetForTitle', () => {
  it('drops system boilerplate and tool traces', () => {
    expect(
      sanitizeAssistantSnippetForTitle(
        '我整理好了上下文，但本次没有生成可展示正文。请给我一句更明确的续写指令。',
      ),
    ).toBe('')
    expect(sanitizeAssistantSnippetForTitle('Read: # 数据来源')).toBe('')
  })

  it('keeps substantive assistant text', () => {
    const text = '建议从银月森林首战写起，重点展示天赋掉宝爽感。'
    expect(sanitizeAssistantSnippetForTitle(text)).toBe(text)
  })
})

describe('buildSessionTitleFallback', () => {
  it('uses novel name for generic continue', () => {
    const title = buildSessionTitleFallback({
      userMessage: '继续',
      novelTitle: '开局无限掉宝',
      now: new Date('2026-06-02T14:30:00'),
    })
    expect(title).toContain('续写')
    expect(title).toContain('开局无限掉宝')
  })

  it('truncates long user messages', () => {
    const title = buildSessionTitleFallback({
      userMessage: '请帮我写一个非常长的第二章开头场景描写',
    })
    expect(title.endsWith('…')).toBe(true)
  })
})

describe('isBoilerplateSessionTitle', () => {
  it('detects known bad titles', () => {
    expect(isBoilerplateSessionTitle("Read: # 数据来源")).toBe(true)
    expect(isBoilerplateSessionTitle('续写第三章')).toBe(false)
  })
})
