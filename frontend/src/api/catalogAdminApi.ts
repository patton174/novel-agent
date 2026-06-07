import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

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

export interface CatalogNovelProgress extends CatalogNovel {
  chaptersExpected?: number | null
  chaptersDone?: number | null
  complete: boolean
  latestJobId?: string | null
  latestJobStatus?: string | null
}

export interface CatalogNovelPage {
  list: CatalogNovel[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface CatalogChapterSummary {
  id: string
  catalogNovelId: string
  title: string
  sortOrder: number
  wordCount: number
  sourceUrl?: string | null
}

export interface CatalogChapterDetail extends CatalogChapterSummary {
  content: string
  createdAt: number
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchCatalogNovel(id: string): Promise<CatalogNovel> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${id}`)
  if (!res.ok) throw new Error('加载书籍失败')
  return parseResponse<CatalogNovel>(res)
}

export async function fetchCatalogProgress(id: string): Promise<CatalogNovelProgress> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${id}/progress`)
  if (!res.ok) throw new Error('加载进度失败')
  return parseResponse<CatalogNovelProgress>(res)
}

export async function fetchCatalogChapters(novelId: string): Promise<CatalogChapterSummary[]> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${novelId}/chapters`)
  if (!res.ok) throw new Error('加载章节列表失败')
  return parseResponse<CatalogChapterSummary[]>(res)
}

export async function fetchCatalogChapter(
  novelId: string,
  chapterId: string,
): Promise<CatalogChapterDetail> {
  const res = await secureFetch(
    `/api/content/crm/catalog/novels/${novelId}/chapters/${chapterId}`,
  )
  if (!res.ok) throw new Error('加载章节正文失败')
  return parseResponse<CatalogChapterDetail>(res)
}

export async function updateCatalogChapter(
  novelId: string,
  chapterId: string,
  payload: Partial<Pick<CatalogChapterDetail, 'title' | 'content' | 'sortOrder' | 'sourceUrl'>>,
): Promise<CatalogChapterDetail> {
  const res = await secureFetch(
    `/api/content/crm/catalog/novels/${novelId}/chapters/${chapterId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw new Error('更新章节失败')
  return parseResponse<CatalogChapterDetail>(res)
}

export async function deleteCatalogChapter(novelId: string, chapterId: string): Promise<void> {
  const res = await secureFetch(
    `/api/content/crm/catalog/novels/${novelId}/chapters/${chapterId}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error('删除章节失败')
}

export async function fetchCatalogNovels(page = 1, size = 20): Promise<CatalogNovelPage> {
  const res = await secureFetch(
    `/api/content/crm/catalog/novels/page?pageCurrent=${page}&pageSize=${size}`,
  )
  if (!res.ok) throw new Error('加载书库失败')
  return parseResponse<CatalogNovelPage>(res)
}

export async function fetchIncompleteCatalog(limit = 50): Promise<CatalogNovelProgress[]> {
  const res = await secureFetch(
    `/api/content/crm/catalog/novels/incomplete?limit=${limit}`,
  )
  if (!res.ok) throw new Error('加载未完成书目失败')
  return parseResponse<CatalogNovelProgress[]>(res)
}

export async function updateCatalogNovel(
  id: string,
  payload: Partial<Pick<CatalogNovel, 'title' | 'author' | 'description' | 'coverUrl' | 'sourceUrl'>>,
): Promise<CatalogNovel> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('更新书库失败')
  return parseResponse<CatalogNovel>(res)
}

export async function setCatalogCover(id: string, coverUrl: string): Promise<CatalogNovel> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${id}/cover`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coverUrl }),
  })
  if (!res.ok) throw new Error('设置封面失败')
  return parseResponse<CatalogNovel>(res)
}

export async function deleteCatalogNovel(id: string): Promise<void> {
  const res = await secureFetch(`/api/content/crm/catalog/novels/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}
