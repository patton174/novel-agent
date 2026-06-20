import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { addCatalogToLibrary, fetchCatalogNovels, type CatalogNovel } from '@/api/catalogApi'
import { collectToMyLibrary } from '@/api/uploadApi'

export interface UseBookstoreResult {
  novels: CatalogNovel[] | null
  loadError: boolean
  addingId: string | null
  collectingId: string | null
  loading: boolean
  load: () => Promise<void>
  handleAdd: (catalogNovelId: string) => Promise<void>
  handleCollect: (catalogNovelId: string) => Promise<void>
}

/** 公共书库：浏览爬取作品，加入作品库 / 收藏到我的书库。逻辑迁自原 BookstorePage。 */
export function useBookstore(): UseBookstoreResult {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [collectingId, setCollectingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const page = await fetchCatalogNovels(1, 50)
      setNovels(page.list)
    } catch (err) {
      setNovels([])
      setLoadError(true)
      appToast.error(err instanceof Error ? err.message : t('dashboard:bookstore.loadFail'))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async (catalogNovelId: string) => {
    setAddingId(catalogNovelId)
    try {
      await addCatalogToLibrary(catalogNovelId)
      appToast.success(t('dashboard:bookstore.addSuccess'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:bookstore.addFail'))
    } finally {
      setAddingId(null)
    }
  }

  const handleCollect = async (catalogNovelId: string) => {
    setCollectingId(catalogNovelId)
    try {
      await collectToMyLibrary(catalogNovelId)
      appToast.success(t('dashboard:bookstore.collectSuccess'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:bookstore.collectFail'))
    } finally {
      setCollectingId(null)
    }
  }

  const loading = novels === null

  return { novels, loadError, addingId, collectingId, loading, load, handleAdd, handleCollect }
}
