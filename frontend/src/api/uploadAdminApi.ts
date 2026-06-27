import i18n from '@/i18n'
import { secureFetch } from '@/security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '@/utils/resultApi'
import type { UploadedFile } from '@/types/file'

export interface UploadCrmPage {
  list: UploadedFile[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(i18n.t('admin:errors.noAdminPermission'))
    }
    throw new Error(await readApiErrorMessage(res))
  }
  return parseResultResponse<T>(res)
}

export async function uploadPublicCatalogFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  const res = await secureFetch('/api/upload/crm/file', { method: 'POST', body: form })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.uploadFail'))
  }
  return parseResponse<UploadedFile>(res)
}

export async function fetchUploadCrmFiles(params: {
  pageCurrent?: number
  pageSize?: number
  status?: 'retryable' | 'failed' | 'pending' | 'parsing'
}): Promise<UploadCrmPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params.pageCurrent ?? 1),
    pageSize: String(params.pageSize ?? 20),
    status: params.status ?? 'retryable',
  })
  const res = await secureFetch(`/api/upload/crm/files?${search}`)
  const page = await parseResponse<UploadCrmPage>(res)
  return {
    list: Array.isArray(page.list) ? page.list : [],
    totalCount: page.totalCount ?? 0,
    pageCurrent: page.pageCurrent ?? 1,
    pageSize: page.pageSize ?? 20,
  }
}
