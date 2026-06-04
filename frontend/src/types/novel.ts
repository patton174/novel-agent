export interface Novel {
  id: string
  title: string
  description?: string | null
  genre?: string | null
  style?: string | null
  targetChapterWords: number
  createdAt: number
  updatedAt: number
}

export interface Volume {
  id: string
  novelId: string
  title: string
  description?: string | null
  sortOrder: number
  chapterCount: number
  createdAt: number
  updatedAt: number
}

export interface ChapterSummary {
  id: string
  novelId: string
  volumeId: string
  volumeTitle?: string | null
  title: string
  summary?: string | null
  sortOrder: number
  wordCount: number
  updatedAt: number
}

export interface Chapter {
  id: string
  novelId: string
  volumeId: string
  title: string
  content: string
  summary?: string | null
  sortOrder: number
  wordCount: number
  createdAt: number
  updatedAt: number
}

export interface CreateNovelPayload {
  title: string
  description?: string
  genre?: string
  style?: string
  targetChapterWords?: number
}

export interface ChapterVersion {
  id: string
  chapterId: string
  novelId: string
  title: string
  content: string
  wordCount: number
  source: string
  createdAt: number
}

export type ReindexStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface ReindexJobStatus {
  ok: boolean
  status: ReindexStatus
  novelId: string
  chapters: number
  indexed: number
  processed: number
  error?: string | null
  startedAt: number
  finishedAt?: number | null
}
