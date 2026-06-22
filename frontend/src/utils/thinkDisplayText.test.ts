import { describe, expect, it } from 'vitest'
import {
  formatThinkDisplayText,
  formatThinkStreamingDisplay,
  splitThinkLines,
} from './thinkDisplayText'

describe('thinkDisplayText', () => {
  it('splits lines', () => {
    expect(splitThinkLines('a\n\nb', true)).toEqual(['a', 'b'])
  })

  it('shows full streaming text while thinking', () => {
    const text = 'a\nb\nc\nd\ne'
    expect(formatThinkStreamingDisplay(text, { expanded: false, maxLines: 3 })).toBe(text)
    expect(formatThinkStreamingDisplay(text, { expanded: true })).toBe(text)
  })

  it('shows tail lines when done and collapsed', () => {
    const text = 'line1\nline2\nline3'
    expect(formatThinkDisplayText(text, { expanded: false, maxLines: 3 })).toBe(
      'line1\nline2\nline3',
    )
  })

  it('shows full body when expanded after done', () => {
    const text = '第一句。第二句。第三句。'
    expect(formatThinkDisplayText(text, { expanded: true, maxLines: 3 })).toBe(text)
  })
})
