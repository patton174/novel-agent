import { describe, expect, it } from 'vitest'
import { buildEditorLocation, readEditorSessionId } from './editorUrlState'

describe('editorUrlState', () => {
  it('reads sessionId or conversationId alias', () => {
    expect(readEditorSessionId('?sessionId=s1')).toBe('s1')
    expect(readEditorSessionId('?conversationId=c1')).toBe('c1')
    expect(readEditorSessionId('?sessionId=s1&conversationId=c1')).toBe('s1')
  })

  it('builds editor location with novel, session aliases, chapter path and prefs', () => {
    const loc = buildEditorLocation({
      chapterId: 'ch-1',
      novelId: 'n-1',
      sessionId: 's-1',
      tab: 'story',
      locale: 'zh',
      theme: 'dark',
    })
    expect(loc.pathname).toBe('/editor/ch-1')
    expect(loc.search).toContain('novelId=n-1')
    expect(loc.search).toContain('sessionId=s-1')
    expect(loc.search).toContain('conversationId=s-1')
    expect(loc.search).toContain('tab=story')
    expect(loc.search).toContain('lang=zh')
    expect(loc.search).toContain('theme=dark')
  })

  it('uses chapter path only on story tab', () => {
    const chat = buildEditorLocation({
      chapterId: 'ch-1',
      novelId: 'n-1',
      sessionId: 's-1',
      tab: 'chat',
    })
    expect(chat.pathname).toBe('/editor')
    expect(chat.search).toContain('novelId=n-1')

    const story = buildEditorLocation({
      chapterId: 'ch-1',
      novelId: 'n-1',
      sessionId: 's-1',
      tab: 'story',
    })
    expect(story.pathname).toBe('/editor/ch-1')
    expect(story.search).toContain('tab=story')
  })
})
