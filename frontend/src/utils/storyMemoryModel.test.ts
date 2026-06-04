import { describe, expect, it } from 'vitest'
import { normalizeStoryMemory } from './storyMemoryModel'

describe('normalizeStoryMemory', () => {
  it('expands nested 人物卡 JSON into ordered fields', () => {
    const doc = normalizeStoryMemory({
      novel: {},
      world: {},
      background: {},
      chapters: {},
      characters: {
        林枫: {
          人物卡: '{"身份":"穿越者","性格":"冷静"}',
        },
      },
    })
    expect(doc.characters[0].id).toBe('林枫')
    expect(doc.characters[0].fields.some((f) => f.key === '身份' && f.value === '穿越者')).toBe(true)
    expect(doc.characters[0].fields.some((f) => f.key === '性格' && f.value === '冷静')).toBe(true)
  })
})
