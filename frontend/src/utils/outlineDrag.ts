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

/** 移动 ↑↓ 排序：同卷内单步上移/下移，复用 buildChapterReorderPlans */
export function buildChapterStepMovePlans(
  chapters: ChapterSummary[],
  chapterId: string,
  direction: 'up' | 'down',
): ChapterReorderPlan[] {
  const dragged = chapters.find((chapter) => chapter.id === chapterId)
  if (!dragged) {
    return []
  }

  const volumeChapters = sortChapters(
    chapters.filter((chapter) => chapter.volumeId === dragged.volumeId),
  )
  const index = volumeChapters.findIndex((chapter) => chapter.id === chapterId)
  if (index < 0) {
    return []
  }

  if (direction === 'up') {
    if (index === 0) {
      return []
    }
    return buildChapterReorderPlans(
      chapters,
      chapterId,
      dragged.volumeId,
      volumeChapters[index - 1].id,
    )
  }

  if (index >= volumeChapters.length - 1) {
    return []
  }
  const afterNext = volumeChapters[index + 2]
  return buildChapterReorderPlans(
    chapters,
    chapterId,
    dragged.volumeId,
    afterNext?.id ?? null,
  )
}

/** 移动 ↑↓ 排序：单步上移/下移卷 */
export function buildVolumeStepMoveIds(
  volumes: Volume[],
  volumeId: string,
  direction: 'up' | 'down',
): string[] {
  const ids = volumes.map((volume) => volume.id)
  const index = ids.indexOf(volumeId)
  if (index < 0) {
    return ids
  }
  if (direction === 'up') {
    if (index === 0) {
      return ids
    }
    return reorderVolumeIds(volumes, volumeId, ids[index - 1])
  }
  if (index >= ids.length - 1) {
    return ids
  }
  return reorderVolumeIds(volumes, volumeId, ids[index + 1])
}

/** 跨卷移动：默认追加到目标卷末尾；position=start 则插到目标卷首 */
export function buildChapterMoveToVolumePlans(
  chapters: ChapterSummary[],
  chapterId: string,
  targetVolumeId: string,
  position: 'start' | 'end' = 'end',
): ChapterReorderPlan[] {
  const dragged = chapters.find((chapter) => chapter.id === chapterId)
  if (!dragged || dragged.volumeId === targetVolumeId) {
    return []
  }
  const targetChapters = sortChapters(
    chapters.filter(
      (chapter) => chapter.volumeId === targetVolumeId && chapter.id !== chapterId,
    ),
  )
  const beforeChapterId =
    position === 'start' && targetChapters.length > 0 ? targetChapters[0].id : null
  return buildChapterReorderPlans(chapters, chapterId, targetVolumeId, beforeChapterId)
}
