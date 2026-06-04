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
