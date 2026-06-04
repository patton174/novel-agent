import { describe, expect, it } from 'vitest'
import { groupSessionsByDate } from './groupSessionsByDate'

describe('groupSessionsByDate', () => {
  const now = new Date('2026-05-30T12:00:00')

  it('groups sessions into today, yesterday, and week buckets', () => {
    const groups = groupSessionsByDate(
      [
        { id: '1', title: 'today', updatedAt: new Date('2026-05-30T10:00:00') },
        { id: '2', title: 'yesterday', updatedAt: new Date('2026-05-29T10:00:00') },
        { id: '3', title: 'week', updatedAt: new Date('2026-05-25T10:00:00') },
      ],
      now,
    )

    expect(groups.map((g) => g.label)).toEqual(['今天', '昨天', '7天内'])
    expect(groups[0].items).toHaveLength(1)
    expect(groups[1].items[0].title).toBe('yesterday')
  })
})
