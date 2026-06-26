import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  BookOpen,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import {
  deleteCatalogNovel,
  fetchCatalogNovels,
  fetchIncompleteCatalog,
  type CatalogNovel,
  type CatalogNovelProgress,
} from '@/api/catalogAdminApi'
import { CatalogOverviewDialog } from '@/components/admin/CatalogOverviewDialog'
import { CatalogReaderModal } from '@/components/admin/CatalogReaderModal'
import { AdminResponsivePixelTable } from '@/components/admin/AdminResponsivePixelTable'
import { AdminTextInput } from '@/components/admin/AdminFormControls'
import {
  PixelCellStack,
  PIXEL_MOBILE_CARD,
  PixelTableActionBar,
  PixelTableActionButton,
  PixelTableActionIconButton,
  type PixelColumn,
} from '@/components/pixel'
import {
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { ProPagination } from '@/components/pro/ProPagination'
import { Skeleton } from '@/components/ui/skeleton'
import { confirmAction } from '@/stores/appDialog'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

interface CatalogAdminPanelProps {
  onOpenJob?: (jobId: string) => void
}

export function CatalogAdminPanel({ onOpenJob }: CatalogAdminPanelProps) {
  const { t } = useTranslation(['admin'])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [novels, setNovels] = useState<CatalogNovel[]>([])
  const [incomplete, setIncomplete] = useState<CatalogNovelProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedNovel, setSelectedNovel] = useState<CatalogNovel | null>(null)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [readerOpen, setReaderOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [catPage, inc] = await Promise.all([
        fetchCatalogNovels(page, PAGE_SIZE),
        fetchIncompleteCatalog(50).catch(() => []),
      ])
      setNovels(catPage.list)
      setTotalCount(catPage.totalCount)
      setIncomplete(inc)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:catalog.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [page, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return novels
    return novels.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.author ?? '').toLowerCase().includes(q) ||
        (n.sourceUrl ?? '').toLowerCase().includes(q),
    )
  }, [novels, query])


  const openNovel = (novel: CatalogNovel) => {
    setSelectedNovel(novel)
    setOverviewOpen(true)
  }

  const openReader = (novel: CatalogNovel) => {
    setSelectedNovel(novel)
    setOverviewOpen(false)
    setReaderOpen(true)
  }

  const handleDeleteNovel = async (novel: CatalogNovel, e?: MouseEvent) => {
    e?.stopPropagation()
    if (!(await confirmAction({
      title: t('admin:catalog.deleteTitle'),
      description: t('admin:catalog.deleteDesc', { title: novel.title }),
      confirmLabel: t('admin:catalog.deleteBtn'),
      danger: true,
    }))) {
      return
    }
    setActingId(novel.id)
    try {
      await deleteCatalogNovel(novel.id)
      appToast.success(t('admin:catalog.deleted'))
      if (selectedNovel?.id === novel.id) {
        setOverviewOpen(false)
        setReaderOpen(false)
        setSelectedNovel(null)
      }
      void load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:catalog.deleteFail'))
    } finally {
      setActingId(null)
    }
  }

  const columns = useMemo((): PixelColumn<CatalogNovel>[] => {
    return [
      {
        key: 'title',
        header: t('admin:catalog.novelTitle'),
        render: (n) => (
          <div className="flex min-w-0 items-center gap-3">
            {n.coverUrl ? (
              <img src={n.coverUrl} alt="" className="size-12 shrink-0 border-2 border-foreground object-cover" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center border-2 border-foreground bg-muted text-muted-foreground">
                <BookOpen className="size-5" />
              </div>
            )}
            <PixelCellStack
              title={n.title}
              subtitle={t('admin:catalog.chapterCount', { count: n.chapterCount })}
            />
          </div>
        ),
      },
      {
        key: 'author',
        header: t('admin:catalog.author'),
        render: (n) => n.author || t('admin:catalog.unknownAuthor'),
      },
      {
        key: 'source',
        header: t('admin:catalog.sourceUrl'),
        className: 'max-w-[200px]',
        render: (n) => (
          <span className="block truncate font-mono text-xs text-muted-foreground">{n.sourceUrl ?? '—'}</span>
        ),
      },
      {
        key: 'actions',
        header: t('admin:users.colActions'),
        align: 'right',
        render: (n) => (
          <PixelTableActionBar align="end">
            <PixelTableActionButton
              onClick={(e) => {
                e.stopPropagation()
                openReader(n)
              }}
            >
              <BookOpen className="size-3.5" />
              {t('admin:catalog.read')}
            </PixelTableActionButton>
            <PixelTableActionButton
              onClick={(e) => {
                e.stopPropagation()
                openNovel(n)
              }}
            >
              <Pencil className="size-3.5" />
              {t('admin:catalog.overview')}
            </PixelTableActionButton>
            <PixelTableActionIconButton
              variant="danger"
              disabled={actingId === n.id}
              onClick={(e) => {
                e.stopPropagation()
                void handleDeleteNovel(n, e)
              }}
            >
              {actingId === n.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </PixelTableActionIconButton>
          </PixelTableActionBar>
        ),
      },
    ]
  }, [actingId, handleDeleteNovel, openNovel, openReader, t])

  return (
    <>
    <AppShellCard>
      <AppShellCardHeader
        title={t('admin:catalog.title')}
        description={t('admin:catalog.desc', { count: totalCount })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <AdminTextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin:catalog.searchPlaceholder')}
                className="w-44 pl-8 sm:w-56"
              />
            </div>
            <PixelTableActionButton onClick={() => void load()}>
              <RefreshCw className="size-4" />
              {t('admin:catalog.refresh')}
            </PixelTableActionButton>
          </div>
        }
      />
      <AppShellCardBody className="space-y-4">
      {incomplete.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            {t('admin:catalog.incomplete', { count: incomplete.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            {incomplete.slice(0, 12).map((n) => (
              <button
                key={n.id ?? n.latestJobId ?? n.title}
                type="button"
                onClick={() => {
                  if (n.id) {
                    openNovel(n)
                  }
                }}
                className="rounded-lg border border-amber-500/20 bg-background/60 px-2.5 py-1 text-xs transition-colors hover:bg-muted/50"
              >
                {n.title} — {n.chaptersDone ?? 0}/{n.chaptersExpected ?? '?'} {t('admin:catalog.chapterUnit')}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {query.trim() ? t('admin:catalog.noMatch') : t('admin:catalog.empty')}
        </p>
      ) : (
        <AdminResponsivePixelTable
          columns={columns}
          data={filtered}
          rowKey="id"
          loading={loading}
          emptyText={query.trim() ? t('admin:catalog.noMatch') : t('admin:catalog.empty')}
          onRowClick={openNovel}
          className="[&_tbody_tr]:cursor-pointer"
          renderMobileCard={(n) => (
            <article className={PIXEL_MOBILE_CARD}>
              <button
                type="button"
                className="flex w-full items-start gap-3 text-left"
                onClick={() => openNovel(n)}
              >
                {n.coverUrl ? (
                  <img
                    src={n.coverUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg border border-border/70 object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
                    <BookOpen className="size-6" />
                  </div>
                )}
                <PixelCellStack
                  title={n.title}
                  subtitle={`${t('admin:catalog.chapterCount', { count: n.chapterCount })} · ${n.author || t('admin:catalog.unknownAuthor')}`}
                />
              </button>
              <PixelTableActionBar className="mt-3 border-t-2 border-foreground/15 pt-3">
                <PixelTableActionButton className="flex-1" onClick={() => openReader(n)}>
                  <BookOpen className="size-3.5" />
                  {t('admin:catalog.read')}
                </PixelTableActionButton>
                <PixelTableActionButton className="flex-1" onClick={() => openNovel(n)}>
                  <Pencil className="size-3.5" />
                  {t('admin:catalog.overview')}
                </PixelTableActionButton>
                <PixelTableActionIconButton
                  className="text-destructive hover:text-destructive"
                  disabled={actingId === n.id}
                  onClick={(e) => void handleDeleteNovel(n, e)}
                >
                  {actingId === n.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </PixelTableActionIconButton>
              </PixelTableActionBar>
            </article>
          )}
        />
      )}

      <ProPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={totalCount}
        disabled={loading}
        onPageChange={setPage}
      />
      </AppShellCardBody>
    </AppShellCard>

      <CatalogOverviewDialog
        novel={selectedNovel}
        open={overviewOpen}
        onOpenChange={(open) => {
          setOverviewOpen(open)
          if (!open && !readerOpen) setSelectedNovel(null)
        }}
        onRead={(n) => openReader(n)}
        onUpdated={() => void load()}
        onDeleted={() => {
          setOverviewOpen(false)
          setReaderOpen(false)
          setSelectedNovel(null)
          void load()
        }}
        onOpenJob={onOpenJob}
      />

      <CatalogReaderModal
        novel={selectedNovel}
        open={readerOpen}
        onOpenChange={(open) => {
          setReaderOpen(open)
          if (!open && !overviewOpen) setSelectedNovel(null)
        }}
        onUpdated={() => void load()}
      />
    </>
  )
}
