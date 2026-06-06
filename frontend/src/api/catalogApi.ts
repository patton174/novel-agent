import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { Novel } from '../types/novel'

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
    throw new Error('加载书库失败')
  }
  return parseResultResponse<CatalogNovelPage>(res)
}

export async function fetchCatalogNovel(catalogNovelId: string): Promise<CatalogNovel> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}`)
  if (!res.ok) {
    throw new Error('加载作品详情失败')
  }
  return parseResultResponse<CatalogNovel>(res)
}

export async function fetchCatalogChapters(catalogNovelId: string): Promise<CatalogChapterSummary[]> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/chapters`)
  if (!res.ok) {
    throw new Error('加载章节目录失败')
  }
  const data = await parseResultResponse<CatalogChapterSummary[]>(res)
  return Array.isArray(data) ? data : []
}

export async function addCatalogToLibrary(catalogNovelId: string): Promise<Novel> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/add`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('添加到我的作品失败')
  }
  return parseResultResponse<Novel>(res)
}
