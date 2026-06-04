import { describe, expect, it } from 'vitest'
import { computeTypewriterStep, sliceTextByRunes } from './useTypewriterStream'

describe('computeTypewriterStep', () => {
  it('advances at least one rune per tick', () => {
    expect(computeTypewriterStep(0, 100, 16, 2)).toBeGreaterThanOrEqual(1)
  })

  it('respects max chars per frame', () => {
    expect(computeTypewriterStep(0, 100, 1000, 2)).toBeLessThanOrEqual(2)
  })

  it('never exceeds target length', () => {
    expect(computeTypewriterStep(8, 10, 1000, 5)).toBe(10)
  })
})

describe('sliceTextByRunes', () => {
  it('slices by unicode code points', () => {
    expect(sliceTextByRunes('雨夜🌧重逢', 3)).toBe('雨夜🌧')
  })
})
