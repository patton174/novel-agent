import { Link } from 'react-router-dom'
import { BookOpen, Library, Plus, RefreshCw } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/FileUploader'
import { ProButton } from '@/components/pro/ProButton'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { useMyLibrary } from './useMyLibrary'

/** 我的书库 — 手机：单列卡片栈。 */
export function MyLibraryMobile() {
  const { t } = useTranslation(['dashboard'])
  const { novels, quotaText, isLoading, load } = useMyLibrary()

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('dashboard:myLibrary.eyebrow')}
        title={t('dashboard:myLibrary.title')}
        icon={Library}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 size-4" /> {t('dashboard:myLibrary.refresh')}
            </Button>
          </div>
        }
      />
      {quotaText ? <p className="text-sm text-muted-foreground">{quotaText}</p> : null}

      <FileUploader
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
        <AppEmptyState title={t('dashboard:myLibrary.empty')} icon={BookOpen} />
      ) : (
        <div className="space-y-3">
          {novels?.map((novel) => (
            <article
              key={novel.id}
              className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                  <BookOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {novel.author ? `${novel.author} · ` : ''}
                    {t('dashboard:myLibrary.chapterCount', { count: novel.chapterCount })}
                  </p>
                </div>
              </div>
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
    </AppPageStack>
  )
}
