import { describe, expect, it } from 'vitest'
import { buildWelcomeMessage } from './buildWelcomeMessage'

describe('buildWelcomeMessage', () => {
  it('returns generic welcome without novel', () => {
    const msg = buildWelcomeMessage(null)
    expect(msg).toContain('Novel AI')
  })

  it('includes novel title and description hint', () => {
    const msg = buildWelcomeMessage({
      id: 'n1',
      title: '星辰之途',
      description: '少年修仙',
      genre: '玄幻',
      style: '爽文',
      targetChapterWords: 3000,
      createdAt: 0,
      updatedAt: 0,
    })
    expect(msg).toContain('星辰之途')
    expect(msg).toContain('简介')
  })
})
