export type UploadStatus = 'pending' | 'parsing' | 'ready' | 'failed'

export interface UploadedFile {
  fileId: string
  status: UploadStatus
  progress: number | null
  originalName: string
  sizeBytes: number
  format: string
  parseError?: string | null
  catalogNovelId?: string | null
  createdAt: number
}

export interface UploadQuota {
  limit: number | string // number 或 'unlimited'
  used: number
  remaining: number | string
}
