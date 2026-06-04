import { describe, expect, it } from 'vitest'
import { chunkLineStable } from './chunkTextForReveal'

describe('chunkLineStable', () => {
  it('uses segment lengths between 5 and 10 except possibly the last remainder', () => {
    const { chunks } = chunkLineStable(
      '一二三四五六七八九十十一十二十三十四十五',
      0,
    )
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i].length).toBeGreaterThanOrEqual(5)
      expect(chunks[i].length).toBeLessThanOrEqual(10)
    }
    expect(chunks[chunks.length - 1].length).toBeGreaterThan(0)
    expect(chunks[chunks.length - 1].length).toBeLessThanOrEqual(10)
  })

  it('keeps complete prefix chunks when more text is appended', () => {
    const shortStr = '一二三四五六七八九〇一二三四五六七八九〇一二三四五六七八九〇'
    const longStr =
      `${shortStr}甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥`
    const a = chunkLineStable(shortStr, 0)
    const b = chunkLineStable(longStr, 0)
    for (let i = 0; i < 3; i++) {
      expect(b.chunks[i]).toBe(a.chunks[i])
    }
  })
})
