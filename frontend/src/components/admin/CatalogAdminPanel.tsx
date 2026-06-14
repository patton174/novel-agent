import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
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
import {
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { AdminPagination } from '@/components/layout/AdminPagination'
import { ResponsiveTable } from '@/components/layout/ResponsiveTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const openNovel = (novel: CatalogNovel) => {
    setSelectedNovel(novel)
    setOverviewOpen(true)
  }

  const openReader = (novel: CatalogNovel) => {
    setSelectedNovel(novel)
    setOverviewOpen(false)
    setReaderOpen(true)
  }

  const handleDeleteNovel = async (novel: CatalogNovel, e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <>
    <AppShellCard>
      <AppShellCardHeader
        title={t('admin:catalog.title')}
        description={t('admin:catalog.desc', { count: totalCount })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin:catalog.searchPlaceholder')}
                className="w-44 pl-8 sm:w-56"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 size-4" />
              {t('admin:catalog.refresh')}
            </Button>
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
        <ResponsiveTable
          columns={[]}
          rows={filtered}
          loading={false}
          getRowKey={(novel) => novel.id}
          wrapDesktopInCard={false}
          renderMobileCard={(n) => (
            <article className="rounded-xl border border-border/70 bg-surface p-3 shadow-sm">
              <button
                type="button"
                className="flex w-full items-start gap-3 text-left"
                onClick={() => openNovel(n)}
              >
                {n.coverUrl ? (
                  <img src={n.coverUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <BookOpen className="size-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('admin:catalog.chapterCount', { count: n.chapterCount })} · {n.author || t('admin:catalog.unknownAuthor')}
                  </p>
                </div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => openReader(n)}>
                  <BookOpen className="mr-1 size-3.5" />
                  {t('admin:catalog.read')}
                </Button>
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => openNovel(n)}>
                  <Pencil className="mr-1 size-3.5" />
                  {t('admin:catalog.overview')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={actingId === n.id}
                  onClick={(e) => void handleDeleteNovel(n, e)}
                >
                  {actingId === n.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>
              </div>
            </article>
          )}
          renderDesktopCustom={(rows) => (
            <div className="space-y-2">
              {rows.map((n) => (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNovel(n)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openNovel(n)
                    }
                  }}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-border/80 p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3"
                >
                  {n.coverUrl ? (
                    <img src={n.coverUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <BookOpen className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('admin:catalog.chapterCount', { count: n.chapterCount })} · {n.author || t('admin:catalog.unknownAuthor')}
                    </p>
                    {n.sourceUrl ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{n.sourceUrl}</p>
                    ) : null}
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        openReader(n)
                      }}
                    >
                      <BookOpen className="mr-1 size-3.5" />
                      {t('admin:catalog.read')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNovel(n)
                      }}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      {t('admin:catalog.overview')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={actingId === n.id}
                      onClick={(e) => void handleDeleteNovel(n, e)}
                    >
                      {actingId === n.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground md:block md:opacity-0 md:transition-opacity md:group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
          emptyState={
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? t('admin:catalog.noMatch') : t('admin:catalog.empty')}
            </p>
          }
        />
      )}

      <AdminPagination
        pageCurrent={page}
        totalPages={totalPages}
        totalCount={totalCount}
        loading={loading}
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
