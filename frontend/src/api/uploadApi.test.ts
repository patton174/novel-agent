import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectToMyLibrary,
  deleteUploadedFile,
  fetchMyLibrary,
  getUploadQuota,
  getUploadedFile,
  listUploadedFiles,
  retryParse,
  uploadFile,
} from './uploadApi'
import type { UploadedFile } from '@/types/file'

vi.mock('@/security/secureFetch', () => ({
  secureFetch: vi.fn(),
}))

import { secureFetch } from '@/security/secureFetch'

const okBody = <T>(data: T) =>
  new Response(JSON.stringify({ code: 200, msg: 'ok', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const failBody = (status: number, msg = 'err') =>
  new Response(JSON.stringify({ code: status, msg, data: null }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const sampleFile: UploadedFile = {
  fileId: 'f1',
  status: 'pending',
  progress: 0,
  originalName: 'a.txt',
  sizeBytes: 10,
  format: 'txt',
  parseError: null,
  catalogNovelId: null,
  createdAt: 1,
}

beforeEach(() => {
  vi.mocked(secureFetch).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('uploadFile', () => {
  it('posts FormData and parses UploadedFile', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(sampleFile))
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
    const result = await uploadFile(file)
    expect(result).toEqual(sampleFile)
    const [url, init] = vi.mocked(secureFetch).mock.calls[0]
    expect(url).toBe('/api/content/auth/upload/file')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
  })

  it('throws 上传数量已达套餐上限 on 409', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(failBody(409))
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
    await expect(uploadFile(file)).rejects.toThrow('上传数量已达套餐上限')
  })

  it('throws generic message on other failures', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(failBody(500))
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
    await expect(uploadFile(file)).rejects.toThrow('上传失败')
  })
})

describe('listUploadedFiles', () => {
  it('returns { list, total }', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(
      okBody({ list: [sampleFile], total: 1, pageCurrent: 1, pageSize: 50 }),
    )
    const result = await listUploadedFiles(2, 20)
    expect(result).toEqual({ list: [sampleFile], total: 1 })
    expect(vi.mocked(secureFetch).mock.calls[0][0]).toContain('pageCurrent=2')
    expect(vi.mocked(secureFetch).mock.calls[0][0]).toContain('pageSize=20')
  })

  it('throws on failure', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(failBody(500))
    await expect(listUploadedFiles()).rejects.toThrow('加载上传列表失败')
  })
})

describe('getUploadedFile', () => {
  it('queries by fileId', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(sampleFile))
    const result = await getUploadedFile('f1')
    expect(result).toEqual(sampleFile)
    expect(vi.mocked(secureFetch).mock.calls[0][0]).toBe('/api/content/auth/upload/files/f1')
  })
})

describe('deleteUploadedFile', () => {
  it('uses DELETE', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(null))
    await deleteUploadedFile('f1')
    const [, init] = vi.mocked(secureFetch).mock.calls[0]
    expect(init?.method).toBe('DELETE')
  })
})

describe('retryParse', () => {
  it('uses POST to /retry', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody({ ...sampleFile, status: 'parsing' }))
    const result = await retryParse('f1')
    expect(result.status).toBe('parsing')
    const [url, init] = vi.mocked(secureFetch).mock.calls[0]
    expect(url).toBe('/api/content/auth/upload/files/f1/retry')
    expect(init?.method).toBe('POST')
  })
})

describe('getUploadQuota', () => {
  it('returns UploadQuota', async () => {
    const quota = { limit: 100, used: 3, remaining: 97 }
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(quota))
    const result = await getUploadQuota()
    expect(result).toEqual(quota)
    expect(vi.mocked(secureFetch).mock.calls[0][0]).toBe('/api/content/auth/upload/quota')
  })
})

describe('collectToMyLibrary', () => {
  it('posts to catalog collect endpoint', async () => {
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(null))
    await collectToMyLibrary('c1')
    const [url, init] = vi.mocked(secureFetch).mock.calls[0]
    expect(url).toBe('/api/content/auth/catalog/novels/c1/collect')
    expect(init?.method).toBe('POST')
  })
})

describe('fetchMyLibrary', () => {
  it('queries my-library endpoint', async () => {
    const page = {
      list: [{ id: 'n1', title: 'T', author: null, description: null, sourceUrl: null, coverUrl: null, chapterCount: 5, createdAt: 1, updatedAt: 1 }],
      totalCount: 1,
      pageCurrent: 1,
      pageSize: 50,
    }
    vi.mocked(secureFetch).mockResolvedValueOnce(okBody(page))
    const result = await fetchMyLibrary()
    expect(result.list).toHaveLength(1)
    expect(vi.mocked(secureFetch).mock.calls[0][0]).toContain('/api/content/auth/catalog/my-library')
  })
})
