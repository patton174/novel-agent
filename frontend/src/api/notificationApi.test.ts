import { describe, expect, it } from 'vitest'
import { normalizeInboxPage } from './notificationApi'

describe('normalizeInboxPage', () => {
  it('maps backend list + read boolean to frontend items', () => {
    const page = normalizeInboxPage({
      list: [
        {
          id: 2,
          category: 'marketing',
          title: '注册即送！！！',
          body: '每天可以领取1M额度',
          read: false,
          createdAt: '2026-06-27T02:35:45.765730Z',
        },
        {
          id: 1,
          category: 'billing',
          title: '订阅即将到期',
          body: '请及时续费',
          read: true,
          createdAt: '2026-06-26T16:14:59.391688Z',
        },
      ],
      hasMore: false,
      nextCursor: 1,
    })

    expect(page.items).toHaveLength(2)
    expect(page.items[0].id).toBe('2')
    expect(page.items[0].readAt).toBeNull()
    expect(page.items[1].readAt).toBe('read')
    expect(page.nextCursor).toBe('1')
    expect(page.hasMore).toBe(false)
  })

  it('still accepts legacy items field', () => {
    const page = normalizeInboxPage({
      items: [
        {
          id: '9',
          category: 'system',
          title: 'Hello',
          readAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].readAt).toBe('2026-01-01T00:00:00.000Z')
  })
})
