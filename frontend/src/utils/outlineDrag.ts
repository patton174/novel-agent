import type { ChapterSummary, Volume } from '../types/novel'

export interface ChapterReorderPlan {
  volumeId: string
  ids: string[]
}

export function sortChapters(list: ChapterSummary[]): ChapterSummary[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.updatedAt - b.updatedAt)
}

export function reorderVolumeIds(volumes: Volume[], draggedId: string, targetId: string): string[] {
  const ids = volumes.map((volume) => volume.id)
  const from = ids.indexOf(draggedId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) {
    return ids
  }
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, draggedId)
  return next
}

export function buildChapterReorderPlans(
  chapters: ChapterSummary[],
  draggedChapterId: string,
  targetVolumeId: string,
  beforeChapterId: string | null,
): ChapterReorderPlan[] {
  const dragged = chapters.find((chapter) => chapter.id === draggedChapterId)
  if (!dragged) {
    return []
  }

  const sourceVolumeId = dragged.volumeId
  let targetList = sortChapters(
    chapters.filter((chapter) => chapter.volumeId === targetVolumeId && chapter.id !== draggedChapterId),
  )

  if (beforeChapterId) {
    const insertAt = targetList.findIndex((chapter) => chapter.id === beforeChapterId)
    const index = insertAt >= 0 ? insertAt : targetList.length
    targetList = [...targetList.slice(0, index), dragged, ...targetList.slice(index)]
  } else {
    targetList = [...targetList, dragged]
  }

  const plans: ChapterReorderPlan[] = [
    { volumeId: targetVolumeId, ids: targetList.map((chapter) => chapter.id) },
  ]

  if (sourceVolumeId !== targetVolumeId) {
    const sourceList = sortChapters(
      chapters.filter((chapter) => chapter.volumeId === sourceVolumeId && chapter.id !== draggedChapterId),
    )
    plans.push({ volumeId: sourceVolumeId, ids: sourceList.map((chapter) => chapter.id) })
  }

  return plans
}
