export type DragKind = 'volume' | 'chapter'

export interface DragPayload {
  kind: DragKind
  id: string
}

export interface DropTarget {
  kind: DragKind
  volumeId: string
  chapterId?: string | null
}

export const OUTLINE_DRAG_MIME = 'application/x-novel-outline'

/** 无卷时用于平铺展示章节的虚拟卷 id */
export const OUTLINE_FLAT_VOLUME_ID = '__outline_flat__'
