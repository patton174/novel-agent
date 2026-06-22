import { describe, expect, it } from 'vitest'
import { chapterVersionExcerpt } from './chapterVersionExcerpt'

describe('chapterVersionExcerpt', () => {
  it('returns first non-empty line trimmed', () => {
    expect(chapterVersionExcerpt('\n\n第一段重点。\n第二段。')).toBe('第一段重点。')
  })

  it('truncates long lines', () => {
    const long = '甲'.repeat(80)
    expect(chapterVersionExcerpt(long)).toHaveLength(56)
    expect(chapterVersionExcerpt(long).endsWith('…')).toBe(true)
  })
})
