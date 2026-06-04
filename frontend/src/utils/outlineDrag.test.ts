import { describe, expect, it } from 'vitest'
import { buildChapterReorderPlans, reorderVolumeIds } from './outlineDrag'
import type { ChapterSummary, Volume } from '../types/novel'

const volumes: Volume[] = [
  {
    id: 'v1',
    novelId: 'n1',
    title: '第一卷',
    sortOrder: 1,
    chapterCount: 2,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'v2',
    novelId: 'n1',
    title: '第二卷',
    sortOrder: 2,
    chapterCount: 1,
    createdAt: 1,
    updatedAt: 1,
  },
]

const chapters: ChapterSummary[] = [
  {
    id: 'c1',
    novelId: 'n1',
    volumeId: 'v1',
    title: '章一',
    sortOrder: 1,
    wordCount: 10,
    updatedAt: 1,
  },
  {
    id: 'c2',
    novelId: 'n1',
    volumeId: 'v1',
    title: '章二',
    sortOrder: 2,
    wordCount: 20,
    updatedAt: 2,
  },
  {
    id: 'c3',
    novelId: 'n1',
    volumeId: 'v2',
    title: '章三',
    sortOrder: 1,
    wordCount: 30,
    updatedAt: 3,
  },
]

describe('outlineDrag', () => {
  it('reorders volume ids', () => {
    expect(reorderVolumeIds(volumes, 'v2', 'v1')).toEqual(['v2', 'v1'])
  })

  it('builds cross-volume move plans', () => {
    const plans = buildChapterReorderPlans(chapters, 'c3', 'v1', 'c2')
    expect(plans).toEqual([
      { volumeId: 'v1', ids: ['c1', 'c3', 'c2'] },
      { volumeId: 'v2', ids: [] },
    ])
  })

  it('builds same-volume reorder plans', () => {
    const plans = buildChapterReorderPlans(chapters, 'c2', 'v1', 'c1')
    expect(plans).toEqual([{ volumeId: 'v1', ids: ['c2', 'c1'] }])
  })
})
