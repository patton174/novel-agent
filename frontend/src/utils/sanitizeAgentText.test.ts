import { describe, expect, it } from 'vitest'
import { appendMessageDeltaContent, sanitizeMessageDeltaChunk } from './sanitizeAgentText'

describe('sanitizeMessageDeltaChunk', () => {
  it('drops open thinking block chunks', () => {
    expect(sanitizeMessageDeltaChunk('<think>The user wants')).toBe('')
  })

  it('keeps text after thinking block closes', () => {
    expect(
      sanitizeMessageDeltaChunk('</think>\n\n雨停了，街道很安静。'),
    ).toBe('\n\n雨停了，街道很安静。')
  })

  it('keeps text after legacy think tag closes', () => {
    expect(sanitizeMessageDeltaChunk('\n\n她推开了门。')).toBe('\n\n她推开了门。')
  })

  it('preserves trailing paragraph newlines in streaming chunks', () => {
    expect(sanitizeMessageDeltaChunk('她愣了一下。\n\n')).toBe('她愣了一下。\n\n')
  })

  it('passes through newline-only chunks for paragraph breaks', () => {
    expect(sanitizeMessageDeltaChunk('\n\n')).toBe('\n\n')
  })

  it('appendMessageDeltaContent preserves paragraph breaks across chunks', () => {
    let body = ''
    body = appendMessageDeltaContent(body, '第一段。')
    body = appendMessageDeltaContent(body, '\n\n')
    body = appendMessageDeltaContent(body, '第二段。')
    expect(body).toBe('第一段。\n\n第二段。')
  })

  it('stripLineLeadingFullwidthIndent removes ideographic paragraph indent', async () => {
    const { stripLineLeadingFullwidthIndent } = await import('./sanitizeAgentText')
    expect(stripLineLeadingFullwidthIndent('　　你好')).toBe('你好')
    expect(stripLineLeadingFullwidthIndent('　')).toBe('')
  })

  it('drops English planning chunks', () => {
    expect(sanitizeMessageDeltaChunk('The user wants to continue the story.')).toBe('')
  })

  it('drops post-write meta / fake option lists', () => {
    expect(
      sanitizeMessageDeltaChunk('续写完成。你可以选择：\n1. foo\n2. bar'),
    ).toBe('')
  })
})

describe('sanitizeAssistantMessage', () => {
  it('preserves paragraph breaks in finalized assistant text', async () => {
    const { sanitizeAssistantMessage } = await import('./sanitizeAgentText')
    const raw = '第一段。\n\n第二段。'
    expect(sanitizeAssistantMessage(raw)).toBe('第一段。\n\n第二段。')
  })
})
