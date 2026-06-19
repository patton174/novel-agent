import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Library, Plus, RefreshCw } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileUploader } from '@/components/ui/FileUploader'
import { appToast } from '@/stores/appToastStore'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { fetchMyLibrary, getUploadQuota } from '@/api/uploadApi'
import type { CatalogNovel } from '@/api/catalogApi'
import type { UploadQuota } from '@/types/file'

export default function MyLibraryPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [quota, setQuota] = useState<UploadQuota | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, q] = await Promise.all([fetchMyLibrary(1, 50), getUploadQuota()])
      setNovels(page.list)
      setQuota(q)
    } catch (err) {
      setNovels([])
      appToast.error(err instanceof Error ? err.message : t('myLibrary.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const quotaText = quota
    ? quota.limit === 'unlimited'
      ? t('myLibrary.quotaUnlimited', { used: quota.used })
      : t('myLibrary.quota', { used: quota.used, limit: quota.limit })
    : ''

  const isLoading = novels === null || loading

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('myLibrary.eyebrow')}
        title={t('myLibrary.title')}
        icon={Library}
        action={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 size-4" /> {t('myLibrary.refresh')}
          </Button>
        }
      />
      {quotaText ? (
        <p className="text-sm text-muted-foreground">{quotaText}</p>
      ) : null}

      <FileUploader
        onUploaded={() => {
          /* 列表稍后轮询到 ready 再刷新 */
        }}
        onResolved={() => void load()}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : novels && novels.length === 0 ? (
        <AppEmptyState title={t('myLibrary.empty')} icon={BookOpen} />
      ) : novels && novels.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <article
              key={novel.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft"
            >
              <h3 className="line-clamp-2 text-lg font-bold text-foreground">{novel.title}</h3>
              {novel.author ? (
                <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p>
              ) : null}
              <p className="mt-auto pt-3 text-xs text-muted-foreground">
                {t('myLibrary.chapterCount', { count: novel.chapterCount })}
              </p>
              <Button className="mt-3" size="sm" onClick={() => void load()}>
                <Plus className="mr-1 size-4" /> {t('myLibrary.addToNovel')}
              </Button>
            </article>
          ))}
        </div>
      ) : null}
    </AppPageStack>
  )
}
