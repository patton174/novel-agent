import { Link } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import {
  AppEmptyState,
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { NovelWorkCard, NovelWorkCardSkeleton } from '@/components/dashboard/NovelWorkCard'
import { Button } from '@/components/ui/button'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { ProPagination } from '@/components/pro/ProPagination'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { EDITOR_CREATE_HREF } from '@/lib/editorRoutes'
import { useNovelsPage } from './useNovelsPage'

const CARD_GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

export function NovelsPageDesktop() {
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
          <Button asChild className={cn('px-5', APP_BTN_MD)}>
            <Link to={EDITOR_CREATE_HREF}>
              <Plus className="mr-2 size-4" />
              {t('dashboard:novels.createNovel')}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className={CARD_GRID_CLASS}>
          {Array.from({ length: 10 }).map((_, i) => (
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
              <Button asChild className={APP_BTN_MD}>
                <Link to={EDITOR_CREATE_HREF}>
                  <Plus className="mr-2 size-4" />
                  {t('dashboard:novels.createFirst')}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <AppShellCard>
          <AppShellCardHeader
            title={t('dashboard:novels.pageTitle')}
            description={t('dashboard:novels.listDesc', { count: total })}
          />
          <AppShellCardBody className="space-y-4">
            <div className={CARD_GRID_CLASS}>
              {pagedNovels.map((novel) => (
                <NovelWorkCard
                  key={novel.id}
                  novel={novel}
                  isGenerating={generatingId === novel.id}
                  onGenerateCover={() => setDialogNovel(novel)}
                />
              ))}
            </div>
            <div className="border-t-2 border-black pt-2">
              <ProPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                className="px-0"
              />
            </div>
          </AppShellCardBody>
        </AppShellCard>
      )}
    </AppPageStack>
  )
}
