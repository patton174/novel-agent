import { secureFetch } from '@/security/secureFetch'
import { parseResultResponse } from '@/utils/resultApi'

export interface StoragePresignResult {
  url: string
  expiresAt: number
}

const presignCache = new Map<string, { url: string; expiresAt: number }>()

/** 将相对预签名路径转为浏览器可请求的绝对 URL。 */
export function resolveStorageMediaUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`
}

function readCachedPresign(storageKey: string): string | null {
  const cached = presignCache.get(storageKey)
  if (!cached) {
    return null
  }
  if (cached.expiresAt > 0 && cached.expiresAt - Date.now() < 60_000) {
    presignCache.delete(storageKey)
    return null
  }
  return cached.url
}

/** 为 storage key 申请预签名访问 URL（带内存缓存，过期前 60s 自动刷新）。 */
export async function presignStorageObject(storageKey: string): Promise<string | null> {
  const key = storageKey.trim()
  if (!key) {
    return null
  }
  const cached = readCachedPresign(key)
  if (cached) {
    return cached
  }
  try {
    const res = await secureFetch('/api/content/auth/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (!res.ok) {
      return null
    }
    const data = await parseResultResponse<StoragePresignResult>(res)
    if (!data?.url) {
      return null
    }
    presignCache.set(key, { url: data.url, expiresAt: data.expiresAt ?? 0 })
    return data.url
  } catch {
    return null
  }
}

/** 清除指定 key 的预签名缓存（如重新生成封面后）。 */
export function invalidateStoragePresign(storageKey: string): void {
  presignCache.delete(storageKey.trim())
}
