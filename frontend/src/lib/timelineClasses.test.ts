import { describe, expect, it } from 'vitest'
import { thinkLeadCellClass, toolLeadCellClass, TOOL_HEADLINE_ROW } from './timelineClasses'

describe('timelineClasses lead alignment', () => {
  it('keeps think lead cell on flex headline row', () => {
    const cls = thinkLeadCellClass()
    expect(cls).toContain('h-[1.35rem]')
    expect(cls).toContain('items-center')
    expect(cls).toContain('flex-[0_0_1.35rem]')
  })

  it('uses grid tool headline row for icon/title pairing', () => {
    expect(TOOL_HEADLINE_ROW).toContain('grid-cols-[1.35rem_minmax(0,1fr)]')
    const cls = toolLeadCellClass()
    expect(cls).toContain('col-start-1')
    expect(cls).toContain('items-center')
  })
})
