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

  it('extractOrchestrationSummary still reads last line (legacy)', () => {
    expect(extractOrchestrationSummary('先 Glob\n- 再 Read 第一章')).toBe('再 Read 第一章')
  })

  it('thinkBodyExcludingSummary returns full text (no split)', () => {
    expect(thinkBodyExcludingSummary('line1\nline2\nline3')).toBe('line1\nline2\nline3')
  })

  it('keeps tail lines while thinking and collapsed', () => {
    const text = 'a\nb\nc\nd\ne'
    expect(
      formatThinkDisplayText(text, { isThinking: true, expanded: false, maxLines: 3 }),
    ).toBe('c\nd\ne')
  })

  it('hides panel body when done and collapsed', () => {
    const text = 'line1\nline2\nline3'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: false, maxLines: 3 }),
    ).toBe('')
  })

  it('shows full text when expanded', () => {
    const text = 'line1\nline2\nline3'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: true, maxLines: 3 }),
    ).toBe('line1\nline2\nline3')
  })
})
