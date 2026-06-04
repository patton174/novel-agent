import { describe, expect, it } from 'vitest'
import { diffLines, isSameText, summarizeDiff } from './textDiff'

describe('textDiff', () => {
  it('returns equal lines for identical text', () => {
    const lines = diffLines('a\nb', 'a\nb')
    expect(lines).toEqual([
      { type: 'equal', text: 'a' },
      { type: 'equal', text: 'b' },
    ])
    expect(summarizeDiff(lines)).toEqual({ equal: 2, insert: 0, delete: 0 })
  })

  it('detects insert and delete lines', () => {
    const lines = diffLines('旧段落\n保留行', '新段落\n保留行')
    expect(lines).toEqual([
      { type: 'delete', text: '旧段落' },
      { type: 'insert', text: '新段落' },
      { type: 'equal', text: '保留行' },
    ])
  })

  it('handles empty to content', () => {
    const lines = diffLines('', '第一行')
    expect(lines).toEqual([{ type: 'insert', text: '第一行' }])
  })

  it('compares full strings', () => {
    expect(isSameText('abc', 'abc')).toBe(true)
    expect(isSameText('abc', 'abd')).toBe(false)
  })
})
