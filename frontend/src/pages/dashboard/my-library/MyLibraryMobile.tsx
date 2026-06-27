import { Link } from 'react-router-dom'
import { BookOpen, Plus, RefreshCw } from 'lucide-react'
import { AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { FileUploader } from '@/components/ui/FileUploader'
import { Button } from '@/components/ui/button'
import { ProButton } from '@/components/pro/ProButton'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { useMyLibrary } from './useMyLibrary'
import { IndexStatusBadge, normalizeIndexStatus } from '@/components/library/IndexStatusBadge'

/** 我的书库 — 手机：紧凑上传 + 卡片列表。 */
export function MyLibraryMobile() {
  const { t } = useTranslation(['dashboard'])
  const { novels, quotaText, isLoading, reindexingIds, load, reindex } = useMyLibrary()

  const showReindex = (status?: string | null) => {
    const s = normalizeIndexStatus(status)
    return s === 'failed' || s === 'pending'
  }

  return (
    <AppPageStack className="gap-6">
      <AppPageIntro
        eyebrow={t('dashboard:myLibrary.eyebrow')}
        title={t('dashboard:myLibrary.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className={APP_BTN_MD}>
              <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" className={cn(APP_BTN_MD, 'gap-1.5')} onClick={() => void load()}>
              <RefreshCw className="size-4" />
              {t('dashboard:myLibrary.refresh')}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{t('dashboard:myLibrary.sectionList')}</p>
          {quotaText ? (
            <span className="font-mono text-xs text-muted-foreground">{quotaText}</span>
          ) : null}
        </div>

        <FileUploader
          compact
          onUploaded={() => {
            /* 列表稍后轮询到 ready 再刷新 */
          }}
          onResolved={() => void load()}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : novels && novels.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
            <BookOpen className="size-7 text-primary" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-foreground">{t('dashboard:myLibrary.empty')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('dashboard:myLibrary.emptyDesc')}</p>
            <Button asChild variant="outline" size="sm" className={cn('mt-4', APP_BTN_MD)}>
              <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {novels?.map((novel) => (
              <article
                key={novel.id}
                className="rounded-xl border border-border/60 bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                      <IndexStatusBadge indexStatus={novel.indexStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {novel.author ? `${novel.author} · ` : ''}
                      {t('dashboard:myLibrary.chapterCount', { count: novel.chapterCount })}
                    </p>
                  </div>
                </div>
                {showReindex(novel.indexStatus) ? (
                  <ProButton
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    disabled={reindexingIds.has(novel.id)}
                    leftIcon={
                      <RefreshCw
                        className={cn('size-4', reindexingIds.has(novel.id) && 'animate-spin')}
                      />
                    }
                    onClick={() => void reindex(novel.id)}
                  >
                    {t('dashboard:library.reindex')}
                  </ProButton>
                ) : null}
                <ProButton
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full"
                  leftIcon={<Plus className="size-4" />}
                  onClick={() => void load()}
                >
                  {t('dashboard:myLibrary.addToNovel')}
                </ProButton>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppPageStack>
  )
}
