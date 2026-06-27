import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { Novel } from '../types/novel'

export type LibraryIndexStatus = 'pending' | 'indexing' | 'indexed' | 'failed'

export interface CatalogNovel {
  id: string
  title: string
  author?: string | null
  description?: string | null
  sourceUrl?: string | null
  coverUrl?: string | null
  chapterCount: number
  createdAt: number
  updatedAt: number
  indexStatus?: LibraryIndexStatus | string | null
}

export interface CatalogChapterSummary {
  id: string
  catalogNovelId: string
  title: string
  sortOrder: number
  wordCount: number
  sourceUrl?: string | null
}

export interface CatalogNovelPage {
  list: CatalogNovel[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export async function fetchCatalogNovels(pageCurrent = 1, pageSize = 20): Promise<CatalogNovelPage> {
  const res = await secureFetch(
    `/api/content/auth/catalog/novels?pageCurrent=${pageCurrent}&pageSize=${pageSize}`,
  )
  if (!res.ok) {
    throw new Error(i18n.t('dashboard:bookstore.loadFail'))
  }
  return parseResultResponse<CatalogNovelPage>(res)
}

export async function fetchCatalogNovel(catalogNovelId: string): Promise<CatalogNovel> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}`)
  if (!res.ok) {
    throw new Error(i18n.t('dashboard:bookstore.loadDetailFail'))
  }
  return parseResultResponse<CatalogNovel>(res)
}

export async function fetchCatalogChapters(catalogNovelId: string): Promise<CatalogChapterSummary[]> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/chapters`)
  if (!res.ok) {
    throw new Error(i18n.t('dashboard:bookstore.loadChaptersFail'))
  }
  const data = await parseResultResponse<CatalogChapterSummary[]>(res)
  return Array.isArray(data) ? data : []
}

export async function addCatalogToLibrary(catalogNovelId: string): Promise<Novel> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/add`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(i18n.t('dashboard:bookstore.addToLibraryFail'))
  }
  return parseResultResponse<Novel>(res)
}
