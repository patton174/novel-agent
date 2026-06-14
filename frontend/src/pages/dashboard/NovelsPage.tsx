import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { BookOpen, Clock, ImagePlus, Plus, Sparkles } from 'lucide-react'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { CoverImageGeneratingOverlay } from '@/components/dashboard/CoverImageGeneratingOverlay'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD, APP_BTN_MD, APP_BTN_OUTLINE_FULL } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { fetchNovels, generateNovelCover, type DashboardNovel } from '@/api/dashboardApi'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import { appToast } from '@/stores/appToastStore'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'

import { useTranslation } from 'react-i18next'

function formatDate(ts: number): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function NovelsPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<DashboardNovel[] | null>(() => dashboardCache.getNovels())
  const [error, setError] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [dialogNovel, setDialogNovel] = useState<DashboardNovel | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchNovels()
      .then((list) => {
        if (!cancelled) {
          dashboardCache.setNovels(list)
          setNovels(list)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNovels([])
          setError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleGenerateCover = useCallback(async (novelId: string, prompt: string) => {
    setGeneratingId(novelId)
    try {
      const updated = await generateNovelCover(novelId, prompt)
      if (updated) {
        setNovels((prev) =>
          prev ? prev.map((n) => (n.id === novelId ? { ...n, ...updated } : n)) : prev,
        )
        appToast.success(t('dashboard:novels.coverSuccess'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dashboard:novels.coverFail')
      appToast.error(message.includes('套餐') ? `${message}${t('dashboard:novels.upgradeHint')}` : message)
    } finally {
      setGeneratingId(null)
    }
  }, [t])

  const loading = novels === null

  return (
    <AppPageStack>
      <CoverGenerateDialog
        open={dialogNovel != null}
        novelId={dialogNovel?.id ?? null}
        novelTitle={dialogNovel?.title ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setDialogNovel(null)
          }
        }}
        onConfirm={async (prompt) => {
          if (!dialogNovel) {
            return
          }
          await handleGenerateCover(dialogNovel.id, prompt)
        }}
      />

      <AppPageIntro
        eyebrow={t('dashboard:novels.eyebrow')}
        title={
          loading ? (
            <InlineTitleSkeleton className="h-8 w-40" />
          ) : (
            t('dashboard:novels.titleCount', { count: novels!.length })
          )
        }
        icon={BookOpen}
        action={
          <Button asChild className={`px-5 ${APP_BTN_MD}`}>
            <Link to={EDITOR_CREATE_HREF}>
              <Plus className="mr-2 size-4" />
              {t('dashboard:novels.createNovel')}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[360px] rounded-2xl" />
          ))}
        </div>
      ) : novels!.length === 0 ? (
        <AppEmptyState
          icon={Sparkles}
          title={error ? t('dashboard:novels.loadFail') : t('dashboard:novels.emptyTitle')}
          description={
            error
              ? t('dashboard:novels.loadFailDesc')
              : t('dashboard:novels.emptyDesc')
          }
          action={
            !error ? (
              <Button
                asChild
                className={`${APP_BTN_MD} bg-primary px-8 text-primary-foreground shadow-md hover:bg-primary/90`}
              >
                <Link to={EDITOR_CREATE_HREF}>
                  <Plus className="mr-2 size-5" />
                  {t('dashboard:novels.createFirst')}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels!.map((novel, index) => {
            const isGenerating = generatingId === novel.id
            return (
              <article
                key={novel.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-400 opacity-80"
                  style={{ opacity: 0.35 + (index % 3) * 0.15 }}
                />
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                  <AnimatePresence mode="wait">
                    {novel.coverUrl && !isGenerating ? (
                      <motion.img
                        key={novel.coverUrl}
                        src={novel.coverUrl}
                        alt={`${novel.title} 封面`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        initial={{ opacity: 0, filter: 'blur(12px)', scale: 1.04 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : !isGenerating ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                        <BookOpen className="size-12 text-primary/40" />
                      </div>
                    ) : null}
                  </AnimatePresence>
                  <CoverImageGeneratingOverlay active={isGenerating} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3
                    className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-foreground"
                    title={novel.title}
                  >
                    {novel.title}
                  </h3>

                  {novel.genre ? (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-ui-sm font-medium text-foreground/70">
                      {novel.genre}
                    </span>
                  ) : null}

                  <div className="mt-auto flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1.5 size-3.5 shrink-0" />
                    {t('dashboard:novels.updatedAt', { time: formatDate(novel.updatedAt) })}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border/80 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    className={`${APP_BTN_OUTLINE_FULL} text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary`}
                    onClick={() => setDialogNovel(novel)}
                  >
                    <ImagePlus className="mr-2 size-4" />
                    {novel.coverUrl ? t('dashboard:novels.regenCover') : t('dashboard:novels.genCover')}
                  </Button>
                  <Button
                    asChild
                    className={APP_BTN_FULL_MD}
                  >
                    <Link to={editorNovelHref(novel.id)}>{t('dashboard:novels.continueWriting')}</Link>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </AppPageStack>
  )
}
