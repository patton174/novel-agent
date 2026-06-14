import type { DropTarget } from './outlineTypes'

export const OUTLINE_DROP_KIND = 'data-outline-drop-kind'
export const OUTLINE_VOLUME_ID = 'data-outline-volume-id'
export const OUTLINE_CHAPTER_ID = 'data-outline-chapter-id'

export function outlineVolumeDropProps(volumeId: string): Record<string, string> {
  return {
    [OUTLINE_DROP_KIND]: 'volume',
    [OUTLINE_VOLUME_ID]: volumeId,
  }
}

export function outlineChapterDropProps(volumeId: string, chapterId: string | null): Record<string, string> {
  return {
    [OUTLINE_DROP_KIND]: 'chapter',
    [OUTLINE_VOLUME_ID]: volumeId,
    [OUTLINE_CHAPTER_ID]: chapterId ?? '',
  }
}

export function findOutlineDropTarget(clientX: number, clientY: number): DropTarget | null {
  let el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  while (el) {
    const kind = el.getAttribute(OUTLINE_DROP_KIND)
    const volumeId = el.getAttribute(OUTLINE_VOLUME_ID)
    if (kind === 'volume' && volumeId) {
      return { kind: 'volume', volumeId }
    }
    if (kind === 'chapter' && volumeId) {
      const chapterId = el.getAttribute(OUTLINE_CHAPTER_ID)
      return {
        kind: 'chapter',
        volumeId,
        chapterId: chapterId || null,
      }
    }
    el = el.parentElement
  }
  return null
}
