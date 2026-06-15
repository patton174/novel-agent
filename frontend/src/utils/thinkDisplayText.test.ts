import { describe, expect, it } from 'vitest'
import { formatThinkDisplayText, splitThinkLines } from './thinkDisplayText'

describe('thinkDisplayText', () => {
  it('splits lines', () => {
    expect(splitThinkLines('a\n\nb', true)).toEqual(['a', 'b'])
  })

  it('keeps last three lines while thinking', () => {
    const text = 'line1\nline2\nline3\nline4\nline5'
    expect(
      formatThinkDisplayText(text, { isThinking: true, expanded: false, maxLines: 3 }),
    ).toBe('line3\nline4\nline5')
  })

  it('keeps only last line when done', () => {
    const text = 'line1\nline2\nline3'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: false, maxLines: 3 }),
    ).toBe('line3')
  })

  it('shows full text when expanded', () => {
    const text = 'line1\nline2'
    expect(
      formatThinkDisplayText(text, { isThinking: false, expanded: true, maxLines: 3 }),
    ).toBe(text)
  })
})
