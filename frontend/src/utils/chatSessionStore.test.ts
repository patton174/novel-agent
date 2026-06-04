import { beforeEach, describe, expect, it } from 'vitest'
import { deleteSession, listSessions, listSessionsByNovel, renameSession, upsertSession } from './chatSessionStore'

describe('chatSessionStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('preserves novelId when remote sync omits it', () => {
    upsertSession({
      id: 'sess-1',
      title: '世界观讨论',
      updatedAt: new Date().toISOString(),
      novelId: 'novel-1',
    })

    upsertSession({
      id: 'sess-1',
      title: '世界观讨论',
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    })

    expect(listSessionsByNovel('novel-1')).toHaveLength(1)
    expect(listSessionsByNovel('novel-1')[0]?.id).toBe('sess-1')
  })

  it('rename and delete session', () => {
    upsertSession({ id: 'sess-a', title: '旧名', updatedAt: new Date().toISOString(), novelId: 'n1' })
    const renamed = renameSession('sess-a', '新名')
    expect(renamed?.title).toBe('新名')
    deleteSession('sess-a')
    expect(listSessions().find((s) => s.id === 'sess-a')).toBeUndefined()
  })
})
