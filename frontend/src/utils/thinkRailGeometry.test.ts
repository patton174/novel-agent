import { describe, expect, it } from 'vitest'
import {
  computeThinkRailSegment,
  computeThinkRailSegments,
  headlineLeadCenterDelta,
} from './thinkRailGeometry'

describe('thinkRailGeometry', () => {
  it('computes segment between two lead rects without including icon height', () => {
    const container = { left: 0, top: 0 }
    const from = { left: 0, right: 20, bottom: 30, top: 10 }
    const to = { left: 0, right: 20, top: 80, bottom: 100 }
    const segment = computeThinkRailSegment(container, from, to, 2)
    expect(segment).toEqual({ left: 10, top: 32, height: 46 })
  })

  it('returns null when leads overlap vertically', () => {
    const container = { left: 0, top: 0 }
    const from = { left: 0, right: 20, bottom: 50, top: 30 }
    const to = { left: 0, right: 20, top: 40, bottom: 60 }
    expect(computeThinkRailSegment(container, from, to)).toBeNull()
  })

  it('builds one segment per adjacent think pair', () => {
    const container = { left: 10, top: 5 }
    const rects = new Map([
      ['a', { left: 10, right: 30, top: 15, bottom: 35 }],
      ['b', { left: 10, right: 30, top: 60, bottom: 80 }],
      ['c', { left: 10, right: 30, top: 110, bottom: 130 }],
    ])
    const segments = computeThinkRailSegments(container, ['a', 'b', 'c'], rects)
    expect(segments).toHaveLength(2)
    expect(segments[0]?.height).toBeGreaterThan(0)
    expect(segments[1]?.height).toBeGreaterThan(0)
    expect(segments[0]!.top + segments[0]!.height).toBeLessThan(rects.get('b')!.top - container.top)
    expect(segments[1]!.top + segments[1]!.height).toBeLessThan(rects.get('c')!.top - container.top)
  })

  it('measures headline and lead center delta', () => {
    expect(
      headlineLeadCenterDelta(
        { top: 100, height: 20 },
        { top: 101, height: 18 },
      ),
    ).toBeCloseTo(0, 1)
    expect(
      headlineLeadCenterDelta(
        { top: 98, height: 20 },
        { top: 102, height: 18 },
      ),
    ).toBeLessThan(0)
  })
})
