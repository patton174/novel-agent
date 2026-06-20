import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Library, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/bookstore">{t('myLibrary.browseBookstore')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 size-4" /> {t('myLibrary.refresh')}
            </Button>
          </div>
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
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : novels && novels.length === 0 ? (
        <AppEmptyState title={t('myLibrary.empty')} icon={BookOpen} />
      ) : novels && novels.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {novels.map((novel) => (
            <article key={novel.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                <BookOpen className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {novel.author ? `${novel.author} · ` : ''}
                  {t('myLibrary.chapterCount', { count: novel.chapterCount })}
                </p>
              </div>
              <Button className="shrink-0" size="sm" onClick={() => void load()}>
                <Plus className="mr-1 size-4" /> {t('myLibrary.addToNovel')}
              </Button>
            </article>
          ))}
        </div>
      ) : null}
    </AppPageStack>
  )
}
