import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Clock, ImagePlus, Plus, Sparkles } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { CoverImageGeneratingOverlay } from '@/components/dashboard/CoverImageGeneratingOverlay'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { ProButton } from '@/components/pro/ProButton'
import { ProPagination } from '@/components/pro/ProPagination'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD, APP_BTN_OUTLINE_FULL } from '@/lib/appButtonTokens'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { formatNovelDate, useNovelsPage } from './useNovelsPage'

export function NovelsPageMobile() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const {
    pagedNovels,
    loading,
    error,
    page,
    pageSize,
    total,
    setPage,
    generatingId,
    dialogNovel,
    setDialogNovel,
    handleGenerateCover,
  } = useNovelsPage()

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
            t('dashboard:novels.titleCount', { count: total })
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <AppEmptyState
          icon={Sparkles}
          title={error ? t('dashboard:novels.loadFail') : t('dashboard:novels.emptyTitle')}
          description={
            error ? t('dashboard:novels.loadFailDesc') : t('dashboard:novels.emptyDesc')
          }
          action={
            !error ? (
              <Button
                asChild
                className={`${APP_BTN_OUTLINE_FULL} text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary`}
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
        <>
          <div className="space-y-3">
            {pagedNovels.map((novel) => {
              const isGenerating = generatingId === novel.id
              return (
                <article
                  key={novel.id}
                  className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft"
                >
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <AnimatePresence mode="wait">
                        {novel.coverUrl && !isGenerating ? (
                          <motion.img
                            key={novel.coverUrl}
                            src={novel.coverUrl}
                            alt={`${novel.title} 封面`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        ) : !isGenerating ? (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                            <BookOpen className="size-6 text-primary/40" />
                          </div>
                        ) : null}
                      </AnimatePresence>
                      {isGenerating ? <CoverImageGeneratingOverlay active /> : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="line-clamp-1 font-bold leading-snug text-foreground"
                        title={novel.title}
                      >
                        {novel.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {novel.genre ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">
                            {novel.genre}
                          </span>
                        ) : null}
                        {/* DashboardNovel 不携带章节数，沿用占位 */}
                        <span>
                          {t('dashboard:novels.colChapters')} —
                        </span>
                        <span className="inline-flex items-center">
                          <Clock className="mr-1 size-3 shrink-0" />
                          {formatNovelDate(novel.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <ProButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isGenerating}
                      loading={isGenerating}
                      leftIcon={<ImagePlus className="size-4" />}
                      onClick={() => setDialogNovel(novel)}
                    >
                      {novel.coverUrl
                        ? t('dashboard:novels.regenCover')
                        : t('dashboard:novels.genCover')}
                    </ProButton>
                    <Button asChild size="sm" className="flex-1">
                      <Link to={editorNovelHref(novel.id)}>
                        {t('dashboard:novels.continueWriting')}
                      </Link>
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          <ProPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </AppPageStack>
  )
}
