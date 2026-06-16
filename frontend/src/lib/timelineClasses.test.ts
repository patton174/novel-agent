import { describe, expect, it } from 'vitest'
import { toolLeadCellClass } from './timelineClasses'

describe('timelineClasses lead alignment', () => {
  it('centers icon in headline row height without vertical nudge', () => {
    const cls = toolLeadCellClass()
    expect(cls).toContain('h-[1.35rem]')
    expect(cls).toContain('items-center')
    expect(cls).not.toContain('self-start')
    expect(cls).not.toContain('baseline')
    expect(cls).not.toContain('translate-y')
  })
})
