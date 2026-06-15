import { describe, expect, it } from 'vitest'
import {
  extractOrchestrationSummary,
  formatThinkDisplayText,
  formatThinkStreamingDisplay,
  splitSentences,
  splitThinkLines,
  thinkBodyExcludingSummary,
} from './thinkDisplayText'

describe('thinkDisplayText', () => {
  it('splits lines', () => {
    expect(splitThinkLines('a\n\nb', true)).toEqual(['a', 'b'])
  })

  it('splits sentences on Chinese and Western punctuation', () => {
    expect(splitSentences('先 Glob。再 Read 第一章。')).toEqual(['先 Glob。', '再 Read 第一章。'])
  })

  it('extracts only the last sentence when multiple sentences share one line', () => {
    const text =
      '让我先读取现有的细纲内容。先读取现有的第5-15章详细细纲，看看完成情况。'
    expect(extractOrchestrationSummary(text)).toBe('先读取现有的第5-15章详细细纲，看看完成情况。')
    expect(thinkBodyExcludingSummary(text)).toBe('让我先读取现有的细纲内容。')
  })

  it('extracts orchestration summary from last line when list item', () => {
    expect(extractOrchestrationSummary('先 Glob\n- 再 Read 第一章')).toBe('再 Read 第一章')
  })

  it('strips summary sentence from think panel body', () => {
    expect(thinkBodyExcludingSummary('line1\nline2\nline3')).toBe('line1\nline2')
    expect(thinkBodyExcludingSummary('only one line')).toBe('')
  })

  it('shows full streaming text while thinking, tail lines when collapsed', () => {
    const text = 'a\nb\nc\nd\ne'
    expect(formatThinkStreamingDisplay(text, { expanded: false, maxLines: 3 })).toBe('c\nd\ne')
    expect(formatThinkStreamingDisplay(text, { expanded: true })).toBe(text)
  })

  it('hides panel body when done and collapsed', () => {
    const text = 'line1\nline2\nline3'
    expect(formatThinkDisplayText(text, { expanded: false, maxLines: 3 })).toBe('')
  })

  it('shows body without summary sentence when expanded after done', () => {
    const text = '第一句。第二句。第三句。'
    expect(formatThinkDisplayText(text, { expanded: true, maxLines: 3 })).toBe('第一句。第二句。')
  })
})
