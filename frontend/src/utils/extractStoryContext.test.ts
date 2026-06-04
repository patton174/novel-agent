import { describe, expect, it } from 'vitest'
import { extractStoryContext } from './extractStoryContext'

describe('extractStoryContext', () => {
  it('returns latest assistant content', () => {
    const text = extractStoryContext([
      { role: 'user', content: '写小说' },
      { role: 'assistant', content: '第一章正文。' },
      { role: 'user', content: '继续' },
    ])
    expect(text).toBe('第一章正文。')
  })

  it('returns undefined when no assistant message', () => {
    expect(extractStoryContext([{ role: 'user', content: '你好' }])).toBeUndefined()
  })
})
