import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { CatalogNovelPage } from './catalogApi'
import type { UploadedFile, UploadQuota } from '../types/file'

const BASE = '/api/content/auth/upload'

export async function uploadFile(file: File, title?: string): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)
  const res = await secureFetch(`${BASE}/file`, { method: 'POST', body: form })
  if (!res.ok) {
    const msg = res.status === 409 ? '上传数量已达套餐上限' : '上传失败'
    throw new Error(msg)
  }
  return parseResultResponse<UploadedFile>(res)
}

export async function listUploadedFiles(
  pageCurrent = 1,
  pageSize = 50,
): Promise<{ list: UploadedFile[]; total: number }> {
  const res = await secureFetch(`${BASE}/files?pageCurrent=${pageCurrent}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('加载上传列表失败')
  const page = await parseResultResponse<{
    list: UploadedFile[]
    total: number
    pageCurrent: number
    pageSize: number
  }>(res)
  return { list: page.list, total: page.total }
}

export async function getUploadedFile(fileId: string): Promise<UploadedFile> {
  const res = await secureFetch(`${BASE}/files/${fileId}`)
  if (!res.ok) throw new Error('查询文件状态失败')
  return parseResultResponse<UploadedFile>(res)
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  const res = await secureFetch(`${BASE}/files/${fileId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function retryParse(fileId: string): Promise<UploadedFile> {
  const res = await secureFetch(`${BASE}/files/${fileId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error('重试失败')
  return parseResultResponse<UploadedFile>(res)
}

export async function getUploadQuota(): Promise<UploadQuota> {
  const res = await secureFetch(`${BASE}/quota`)
  if (!res.ok) throw new Error('加载配额失败')
  return parseResultResponse<UploadQuota>(res)
}

// 公共书库 → 收藏到我的书库（轻引用）
export async function collectToMyLibrary(catalogNovelId: string): Promise<void> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/collect`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('收藏失败')
}

// 我的书库列表（收藏 + 自己上传）
export async function fetchMyLibrary(
  pageCurrent = 1,
  pageSize = 50,
): Promise<CatalogNovelPage> {
  const res = await secureFetch(
    `/api/content/auth/catalog/my-library?pageCurrent=${pageCurrent}&pageSize=${pageSize}`,
  )
  if (!res.ok) throw new Error('加载我的书库失败')
  return parseResultResponse<CatalogNovelPage>(res)
}
