import { Link } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { NovelWorkCard, NovelWorkCardSkeleton } from '@/components/dashboard/NovelWorkCard'
import { Button } from '@/components/ui/button'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { ProPagination } from '@/components/pro/ProPagination'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD, APP_BTN_OUTLINE_FULL } from '@/lib/appButtonTokens'
import { EDITOR_CREATE_HREF } from '@/lib/editorRoutes'
import { useNovelsPage } from './useNovelsPage'

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
    <AppPageStack className="gap-8">
      <CoverGenerateDialog
        open={dialogNovel != null}
        novelId={dialogNovel?.id ?? null}
        novelTitle={dialogNovel?.title ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setDialogNovel(null)
          }
        }}
        onGenerate={(payload) => {
          if (!dialogNovel) return
          handleGenerateCover(dialogNovel.id, payload)
        }}
      />

      <AppPageIntro
        eyebrow={t('dashboard:novels.eyebrow')}
        title={
          loading ? (
            <InlineTitleSkeleton className="h-8 w-40" />
          ) : (
            t('dashboard:novels.pageTitle')
          )
        }
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
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NovelWorkCardSkeleton key={i} />
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
          <div className="grid grid-cols-2 gap-3">
            {pagedNovels.map((novel) => (
              <NovelWorkCard
                key={novel.id}
                novel={novel}
                isGenerating={generatingId === novel.id}
                onGenerateCover={() => setDialogNovel(novel)}
              />
            ))}
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
