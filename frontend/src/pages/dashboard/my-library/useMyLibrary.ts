import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { fetchMyLibrary, getUploadQuota } from '@/api/uploadApi'
import { retryLibraryIndex } from '@/api/libraryApi'
import type { CatalogNovel } from '@/api/catalogApi'
import type { UploadQuota } from '@/types/file'

export interface UseMyLibraryResult {
  novels: CatalogNovel[] | null
  quota: UploadQuota | null
  quotaText: string
  isLoading: boolean
  reindexingIds: Set<string>
  load: () => Promise<void>
  reindex: (catalogNovelId: string) => Promise<void>
}

/** 我的书库：上传与收藏书目列表 + 上传配额。逻辑迁自原 MyLibraryPage（行为保持一致）。 */
export function useMyLibrary(): UseMyLibraryResult {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [quota, setQuota] = useState<UploadQuota | null>(null)
  const [loading, setLoading] = useState(false)
  const [reindexingIds, setReindexingIds] = useState<Set<string>>(() => new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, q] = await Promise.all([fetchMyLibrary(1, 50), getUploadQuota()])
      setNovels(page.list)
      setQuota(q)
    } catch (err) {
      setNovels([])
      appToast.error(err instanceof Error ? err.message : t('dashboard:myLibrary.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const reindex = useCallback(
    async (catalogNovelId: string) => {
      setReindexingIds((prev) => new Set(prev).add(catalogNovelId))
      try {
        await retryLibraryIndex(catalogNovelId)
        appToast.success(t('dashboard:library.reindexSuccess'))
        await load()
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : t('dashboard:library.reindexFail'))
      } finally {
        setReindexingIds((prev) => {
          const next = new Set(prev)
          next.delete(catalogNovelId)
          return next
        })
      }
    },
    [load, t],
  )

  useEffect(() => {
    void load()
  }, [load])

  const quotaText = quota
    ? quota.limit === 'unlimited'
      ? t('dashboard:myLibrary.quotaUnlimited', { used: quota.used })
      : t('dashboard:myLibrary.quota', { used: quota.used, limit: quota.limit })
    : ''

  const isLoading = novels === null || loading

  return { novels, quota, quotaText, isLoading, reindexingIds, load, reindex }
}
