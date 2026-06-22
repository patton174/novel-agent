import { describe, expect, it } from 'vitest'
import { scrollProgressToElapsed, timelineRailFillPct, timelineStepState } from './marketingStoryScroll'

const timing = {
  sendAt: 2_200,
  promptAt: 2_600,
  agentAt: 3_000,
  runEnd: 12_000,
  outputAt: 9_200,
}

describe('marketingStoryScroll', () => {
  it('maps progress 0 and 1 to elapsed bounds', () => {
    expect(scrollProgressToElapsed(0, timing)).toBe(0)
    expect(scrollProgressToElapsed(1, timing)).toBe(timing.runEnd)
  })

  it('interpolates mid progress between phase timestamps', () => {
    const mid = scrollProgressToElapsed(0.5, timing)
    expect(mid).toBeGreaterThan(timing.promptAt)
    expect(mid).toBeLessThan(timing.outputAt)
  })

  it('advances timeline step states with progress', () => {
    expect(timelineStepState(0, 0, 4)).toBe('pending')
    expect(timelineStepState(0, 0.2, 4)).toBe('active')
    expect(timelineStepState(0, 0.3, 4)).toBe('done')
  })

  it('fills rail between first and last node', () => {
    expect(timelineRailFillPct(0, 10, 76)).toBe(10)
    expect(timelineRailFillPct(1, 10, 76)).toBe(76)
  })
})
