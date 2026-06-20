import { Link } from 'react-router-dom'
import { BookOpen, ImagePlus, Plus, Sparkles } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { Button } from '@/components/ui/button'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { ProButton } from '@/components/pro/ProButton'
import { ProPagination } from '@/components/pro/ProPagination'
import { ProColumn, ProTable } from '@/components/pro/ProTable'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD, APP_BTN_OUTLINE_FULL } from '@/lib/appButtonTokens'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { type DashboardNovel } from '@/api/dashboardApi'
import { formatNovelDate, useNovelsPage } from './useNovelsPage'

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

  // DashboardNovel 不携带章节数字段（fetchNovels 不返回），列保留占位以贴合表头约定
  const columns: ProColumn<DashboardNovel>[] = [
    {
      key: 'title',
      header: t('dashboard:novels.colTitle'),
      render: (novel) => (
        <span className="line-clamp-1 font-medium text-foreground" title={novel.title}>
          {novel.title}
        </span>
      ),
    },
    {
      key: 'genre',
      header: t('dashboard:novels.colGenre'),
      render: (novel) =>
        novel.genre ? (
          <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-ui-sm font-medium text-foreground/70">
            {novel.genre}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'chapters',
      header: t('dashboard:novels.colChapters'),
      render: () => <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'updatedAt',
      header: t('dashboard:novels.colUpdatedAt'),
      render: (novel) => (
        <span className="text-muted-foreground">{formatNovelDate(novel.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('dashboard:novels.colActions'),
      align: 'right',
      render: (novel) => {
        const isGenerating = generatingId === novel.id
        return (
          <div className="flex items-center justify-end gap-2">
            <ProButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={isGenerating}
              loading={isGenerating}
              leftIcon={<ImagePlus className="size-4" />}
              onClick={() => setDialogNovel(novel)}
            >
              {novel.coverUrl ? t('dashboard:novels.regenCover') : t('dashboard:novels.genCover')}
            </ProButton>
            <Button asChild size="sm">
              <Link to={editorNovelHref(novel.id)}>{t('dashboard:novels.continueWriting')}</Link>
            </Button>
          </div>
        )
      },
    },
  ]

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
        <ProTable columns={columns} data={[]} rowKey="id" loading skeletonRows={5} />
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
          <ProTable
            columns={columns}
            data={pagedNovels}
            rowKey="id"
            emptyText={t('dashboard:novels.emptyTitle')}
          />
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
