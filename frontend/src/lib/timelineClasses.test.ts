import { describe, expect, it } from 'vitest'
import { thinkLeadCellClass, toolLeadCellClass, TOOL_HEADLINE_ROW } from './timelineClasses'

describe('timelineClasses lead alignment', () => {
  it('keeps think lead cell on flex headline row', () => {
    const cls = thinkLeadCellClass()
    expect(cls).toContain('h-[1.35rem]')
    expect(cls).toContain('items-center')
    expect(cls).toContain('flex-[0_0_1.35rem]')
  })

  it('uses flex tool headline row pinned to title line', () => {
    expect(TOOL_HEADLINE_ROW).toContain('items-start')
    expect(TOOL_HEADLINE_ROW).not.toContain('items-center')
    const cls = toolLeadCellClass()
    expect(cls).toContain('flex-[0_0_1.35rem]')
    expect(cls).toContain('items-center')
  })
})
