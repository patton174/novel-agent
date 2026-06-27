import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface SelectableBook {
  catalogNovelId: string
  title: string
  author?: string | null
  summary?: string | null
  chapterCount?: number
  indexStatus: string
  source?: string | null
}

export async function fetchSelectableBooks(query?: string): Promise<SelectableBook[]> {
  const q = query ? `?query=${encodeURIComponent(query)}` : ''
  const res = await secureFetch(`/api/content/auth/catalog/my-library/selectable${q}`)
  if (!res.ok) throw new Error('加载书库失败')
  return parseResultResponse<SelectableBook[]>(res)
}

export async function retryLibraryIndex(catalogNovelId: string): Promise<void> {
  const res = await secureFetch(
    `/api/content/auth/catalog/my-library/${encodeURIComponent(catalogNovelId)}/reindex`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error('重试索引失败')
  await parseResultResponse<void>(res)
}
