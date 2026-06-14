import { describe, expect, it } from 'vitest'
import {
  DELIVERY_COLLAPSE_CHAR_THRESHOLD,
  DELIVERY_COLLAPSE_LINE_THRESHOLD,
  shouldCollapseDeliveryText,
} from './timelineMobileCollapse'

describe('shouldCollapseDeliveryText', () => {
  it('returns false for short single-line text', () => {
    expect(shouldCollapseDeliveryText('你好，这是简短回复。')).toBe(false)
  })

  it('returns true when char count exceeds threshold', () => {
    const text = 'x'.repeat(DELIVERY_COLLAPSE_CHAR_THRESHOLD + 1)
    expect(shouldCollapseDeliveryText(text)).toBe(true)
  })

  it('returns true when line count exceeds threshold', () => {
    const lines = Array.from({ length: DELIVERY_COLLAPSE_LINE_THRESHOLD + 1 }, (_, i) => `line ${i}`)
    expect(shouldCollapseDeliveryText(lines.join('\n'))).toBe(true)
  })

  it('returns false for empty or whitespace', () => {
    expect(shouldCollapseDeliveryText('')).toBe(false)
    expect(shouldCollapseDeliveryText('   \n  ')).toBe(false)
  })
})
