import { describe, expect, it } from 'vitest'
import { normalizeStoryMemory } from './storyMemoryModel'

describe('chapter memory display titles', () => {
  it('uses envelope title or summary heading instead of UUID', () => {
    const memory = normalizeStoryMemory({
      novel: {},
      world: {},
      background: {},
      characters: {},
      chapters: {
        '11639021-d1c3-43e0-8581-08755eeb74dd': {
          title: '第10章《新的开始》',
          摘要: '# 第10章《新的开始》摘要\n\n## 天梯广场',
        },
      },
    })
    expect(memory.chapters).toHaveLength(1)
    expect(memory.chapters[0].displayTitle).toBe('第10章《新的开始》')
    expect(memory.chapters[0].id).toBe('11639021-d1c3-43e0-8581-08755eeb74dd')
  })
})
