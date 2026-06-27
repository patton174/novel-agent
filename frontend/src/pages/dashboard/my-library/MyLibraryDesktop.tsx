import { Link } from 'react-router-dom'
import { BookOpen, Plus, RefreshCw } from 'lucide-react'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { FileUploader } from '@/components/ui/FileUploader'
import { Button } from '@/components/ui/button'
import { TableActionBar, TableActionButton } from '@/components/shared/TableActions'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import type { CatalogNovel } from '@/api/catalogApi'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { useMyLibrary } from './useMyLibrary'
import { IndexStatusBadge, normalizeIndexStatus } from '@/components/library/IndexStatusBadge'

/** 我的书库 — 桌面：工具栏 + 紧凑上传 + 书目表格。 */
export function MyLibraryDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { novels, quotaText, isLoading, reindexingIds, load, reindex } = useMyLibrary()

  const showReindex = (status?: string | null) => {
    const s = normalizeIndexStatus(status)
    return s === 'failed' || s === 'pending'
  }

  const columns: ProColumn<CatalogNovel>[] = [
    {
      key: 'title',
      header: t('dashboard:myLibrary.colTitle'),
      render: (n) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">{n.title}</span>
          <IndexStatusBadge indexStatus={n.indexStatus} />
        </div>
      ),
    },
    {
      key: 'author',
      header: t('dashboard:myLibrary.colAuthor'),
      render: (n) => <span className="text-muted-foreground">{n.author ?? '—'}</span>,
    },
    {
      key: 'chapters',
      header: t('dashboard:myLibrary.colChapters'),
      align: 'right',
      render: (n) => (
        <span className="tabular-nums text-muted-foreground">
          {t('dashboard:myLibrary.chapterCount', { count: n.chapterCount })}
        </span>
      ),
    },
    {
      key: 'action',
      header: t('dashboard:myLibrary.colAction'),
      align: 'right',
      render: (n) => (
        <TableActionBar align="end">
          {showReindex(n.indexStatus) ? (
            <TableActionButton
              variant="outline"
              disabled={reindexingIds.has(n.id)}
              onClick={() => void reindex(n.id)}
            >
              <RefreshCw className={cn('size-4', reindexingIds.has(n.id) && 'animate-spin')} />
              {t('dashboard:library.reindex')}
            </TableActionButton>
          ) : null}
          <TableActionButton variant="outline" onClick={() => void load()}>
            <Plus className="size-4" />
            {t('dashboard:myLibrary.addToNovel')}
          </TableActionButton>
        </TableActionBar>
      ),
    },
  ]

  const count = novels?.length ?? 0
  const showEmpty = !isLoading && count === 0

  return (
    <AppPageStack className="gap-8">
      <AppPageIntro
        eyebrow={t('dashboard:myLibrary.eyebrow')}
        title={t('dashboard:myLibrary.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className={APP_BTN_MD}>
              <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(APP_BTN_MD, 'gap-2 normal-case')}
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              {t('dashboard:myLibrary.refresh')}
            </Button>
          </div>
        }
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:myLibrary.sectionList')}
          description={t('dashboard:myLibrary.description')}
          action={
            quotaText ? (
              <span className="shrink-0 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                {quotaText}
              </span>
            ) : null
          }
        />
        <AppShellCardBody className="space-y-4">
          <FileUploader
            compact
            onUploaded={() => {
              /* 列表稍后轮询到 ready 再刷新 */
            }}
            onResolved={() => void load()}
          />

          {showEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-6 py-12 text-center">
              <BookOpen className="size-8 text-primary" aria-hidden />
              <p className="mt-3 text-base font-semibold text-foreground">{t('dashboard:myLibrary.empty')}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('dashboard:myLibrary.emptyDesc')}
              </p>
              <Button asChild variant="outline" className={cn('mt-4', APP_BTN_MD)}>
                <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
              </Button>
            </div>
          ) : (
            <ProTable
              columns={columns}
              data={novels ?? []}
              rowKey="id"
              loading={isLoading}
              embedded
              dense
              emptyText={t('dashboard:myLibrary.empty')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
