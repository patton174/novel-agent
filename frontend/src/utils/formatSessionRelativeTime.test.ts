import { describe, expect, it } from 'vitest'
import { formatSessionRelativeTime } from './formatSessionRelativeTime'

describe('formatSessionRelativeTime', () => {
  const now = new Date('2026-06-02T15:00:00')

  it('formats minutes and hours', () => {
    expect(formatSessionRelativeTime(new Date('2026-06-02T14:50:00'), now)).toBe('10 分钟前')
    expect(formatSessionRelativeTime(new Date('2026-06-02T13:00:00'), now)).toBe('2 小时前')
  })

  it('formats yesterday and days', () => {
    expect(formatSessionRelativeTime(new Date('2026-06-01T12:00:00'), now)).toBe('昨天')
    expect(formatSessionRelativeTime(new Date('2026-05-28T12:00:00'), now)).toBe('5 天前')
  })
})
