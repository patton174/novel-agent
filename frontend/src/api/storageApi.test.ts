import { describe, expect, it } from 'vitest'
import { invalidateStoragePresign, presignStorageObject, resolveStorageMediaUrl } from './storageApi'

describe('resolveStorageMediaUrl', () => {
  it('returns absolute http urls unchanged', () => {
    expect(resolveStorageMediaUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
  })

  it('prefixes relative api paths with origin', () => {
    const url = resolveStorageMediaUrl('/api/content/media/object?key=covers%2F1%2Fa.png')
    expect(url).toMatch(/\/api\/content\/media\/object\?key=/)
  })
})

describe('presignStorageObject', () => {
  it('returns null for blank key without fetching', async () => {
    await expect(presignStorageObject('   ')).resolves.toBeNull()
  })

  it('invalidate clears cache so next call would refetch', async () => {
    const key = 'covers/1/test-cache.png'
    invalidateStoragePresign(key)
    await expect(presignStorageObject('')).resolves.toBeNull()
  })
})
