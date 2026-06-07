import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronLeft,
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
import { CatalogNovelDetailModal } from '@/components/admin/CatalogNovelDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

interface CatalogAdminPanelProps {
  onOpenJob?: (jobId: string) => void
}

export function CatalogAdminPanel({ onOpenJob }: CatalogAdminPanelProps) {
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [novels, setNovels] = useState<CatalogNovel[]>([])
  const [incomplete, setIncomplete] = useState<CatalogNovelProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedNovel, setSelectedNovel] = useState<CatalogNovel | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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
      appToast.error(err instanceof Error ? err.message : '加载书库失败')
    } finally {
      setLoading(false)
    }
  }, [page])

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
    setDetailOpen(true)
  }

  const handleDeleteNovel = async (novel: CatalogNovel, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`确定删除《${novel.title}》及其全部章节？此操作不可恢复。`)) {
      return
    }
    setActingId(novel.id)
    try {
      await deleteCatalogNovel(novel.id)
      appToast.success('已删除')
      if (selectedNovel?.id === novel.id) {
        setDetailOpen(false)
        setSelectedNovel(null)
      }
      void load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setActingId(null)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">书库管理</h2>
          <span className="text-sm text-muted-foreground">共 {totalCount} 本</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索书名 / 作者 / 来源"
              className="w-56 pl-8"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-4" />
            刷新
          </Button>
        </div>
      </div>

      {incomplete.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            未完成爬取 ({incomplete.length})
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
                {n.title} — {n.chaptersDone ?? 0}/{n.chaptersExpected ?? '?'} 章
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
          {query.trim() ? '无匹配结果' : '书库为空，请先通过爬虫入库'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
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
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 p-3 transition-colors hover:bg-muted/30"
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
                  {n.chapterCount} 章 · {n.author || '未知作者'}
                </p>
                {n.sourceUrl ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{n.sourceUrl}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                  编辑
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
              <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}

      <CatalogNovelDetailModal
        novel={selectedNovel}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedNovel(null)
        }}
        onUpdated={() => void load()}
        onDeleted={() => {
          setDetailOpen(false)
          setSelectedNovel(null)
          void load()
        }}
        onOpenJob={onOpenJob}
      />
    </section>
  )
}
