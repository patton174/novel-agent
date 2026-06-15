import { describe, expect, it } from 'vitest'
import {
  extractOrchestrationSummary,
  formatThinkDisplayText,
  splitThinkLines,
  thinkBodyExcludingSummary,
} from './thinkDisplayText'

describe('thinkDisplayText', () => {
  it('splits lines', () => {
    expect(splitThinkLines('a\n\nb', true)).toEqual(['a', 'b'])
  })

  it('extracts orchestration summary from last non-empty line', () => {
    expect(extractOrchestrationSummary('先 Glob\n- 再 Read 第一章')).toBe('再 Read 第一章')
  })

  it('strips summary line from think panel body', () => {
    expect(thinkBodyExcludingSummary('line1\nline2\nline3')).toBe('line1\nline2')
    expect(thinkBodyExcludingSummary('only one line')).toBe('')
  })

  it('keeps tail lines while thinking and collapsed, excluding summary line', () => {
    const text = 'a\nb\nc\nd\ne'
    expect(
      formatThinkDisplayText(text, { isThinking: true, expanded: false, maxLines: 3 }),
    ).toBe('b\nc\nd')
  })

  it('hides panel body when done and collapsed', () => {
    const text = 'line1\nline2\nline3'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: false, maxLines: 3 }),
    ).toBe('')
  })

  it('shows body without summary when expanded', () => {
    const text = 'line1\nline2\nline3'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: true, maxLines: 3 }),
    ).toBe('line1\nline2')
  })
})
