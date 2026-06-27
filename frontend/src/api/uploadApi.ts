import i18n from '@/i18n'
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
    const msg =
      res.status === 409
        ? i18n.t('admin:errors.uploadQuotaExceeded')
        : i18n.t('admin:errors.uploadFail')
    throw new Error(msg)
  }
  return parseResultResponse<UploadedFile>(res)
}

export async function listUploadedFiles(
  pageCurrent = 1,
  pageSize = 50,
): Promise<{ list: UploadedFile[]; total: number }> {
  const res = await secureFetch(`${BASE}/files?pageCurrent=${pageCurrent}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadUploadListFail'))
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
  if (!res.ok) throw new Error(i18n.t('admin:errors.queryFileStatusFail'))
  return parseResultResponse<UploadedFile>(res)
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  const res = await secureFetch(`${BASE}/files/${fileId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.deleteFail'))
}

export async function retryParse(fileId: string): Promise<UploadedFile> {
  const res = await secureFetch(`${BASE}/files/${fileId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.retryFail'))
  return parseResultResponse<UploadedFile>(res)
}

export async function getUploadQuota(): Promise<UploadQuota> {
  const res = await secureFetch(`${BASE}/quota`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadQuotaFail'))
  return parseResultResponse<UploadQuota>(res)
}

// 公共书库 → 收藏到我的书库（轻引用）
export async function collectToMyLibrary(catalogNovelId: string): Promise<void> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/collect`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.collectFail'))
}

// 我的书库列表（收藏 + 自己上传）
export async function fetchMyLibrary(
  pageCurrent = 1,
  pageSize = 50,
): Promise<CatalogNovelPage> {
  const res = await secureFetch(
    `/api/content/auth/catalog/my-library?pageCurrent=${pageCurrent}&pageSize=${pageSize}`,
  )
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadMyLibraryFail'))
  return parseResultResponse<CatalogNovelPage>(res)
}
