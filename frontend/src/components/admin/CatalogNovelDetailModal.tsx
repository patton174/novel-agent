import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save, Trash2 } from 'lucide-react'
import {
  deleteCatalogChapter,
  deleteCatalogNovel,
  fetchCatalogChapter,
  fetchCatalogChapters,
  fetchCatalogProgress,
  updateCatalogChapter,
  updateCatalogNovel,
  type CatalogChapterDetail,
  type CatalogChapterSummary,
  type CatalogNovel,
  type CatalogNovelProgress,
} from '@/api/catalogAdminApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

interface CatalogNovelDetailModalProps {
  novel: CatalogNovel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  onOpenJob?: (jobId: string) => void
}

export function CatalogNovelDetailModal({
  novel,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onOpenJob,
}: CatalogNovelDetailModalProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [progress, setProgress] = useState<CatalogNovelProgress | null>(null)
  const [chapters, setChapters] = useState<CatalogChapterSummary[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [chapterDetail, setChapterDetail] = useState<CatalogChapterDetail | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterContent, setChapterContent] = useState('')
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [savingNovel, setSavingNovel] = useState(false)
  const [savingChapter, setSavingChapter] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const resetForms = useCallback((n: CatalogNovel) => {
    setTitle(n.title)
    setAuthor(n.author ?? '')
    setDescription(n.description ?? '')
    setCoverUrl(n.coverUrl ?? '')
    setSourceUrl(n.sourceUrl ?? '')
  }, [])

  const loadChapters = useCallback(async (novelId: string) => {
    const list = await fetchCatalogChapters(novelId)
    setChapters(list)
    return list
  }, [])

  const loadDetail = useCallback(async () => {
    if (!novel) return
    setLoadingMeta(true)
    setSelectedChapterId(null)
    setChapterDetail(null)
    resetForms(novel)
    try {
      const [prog, list] = await Promise.all([
        fetchCatalogProgress(novel.id).catch(() => null),
        loadChapters(novel.id),
      ])
      setProgress(prog)
      if (list.length > 0) {
        setSelectedChapterId(list[0].id)
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '加载详情失败')
    } finally {
      setLoadingMeta(false)
    }
  }, [loadChapters, novel, resetForms])

  useEffect(() => {
    if (open && novel) {
      void loadDetail()
    }
  }, [open, novel, loadDetail])

  useEffect(() => {
    if (!open || !novel || !selectedChapterId) {
      setChapterDetail(null)
      return
    }
    let cancelled = false
    setLoadingChapter(true)
    void fetchCatalogChapter(novel.id, selectedChapterId)
      .then((detail) => {
        if (cancelled) return
        setChapterDetail(detail)
        setChapterTitle(detail.title)
        setChapterContent(detail.content)
      })
      .catch((err) => {
        if (!cancelled) {
          appToast.error(err instanceof Error ? err.message : '加载章节失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingChapter(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, novel, selectedChapterId])

  if (!novel) return null

  const handleSaveNovel = async () => {
    setSavingNovel(true)
    try {
      await updateCatalogNovel(novel.id, {
        title: title.trim(),
        author: author.trim(),
        description,
        coverUrl: coverUrl.trim(),
        sourceUrl: sourceUrl.trim(),
      })
      appToast.success('书籍信息已保存')
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSavingNovel(false)
    }
  }

  const handleDeleteNovel = async () => {
    if (!window.confirm(`确定删除《${title || novel.title}》及其全部章节？`)) return
    setDeleting(true)
    try {
      await deleteCatalogNovel(novel.id)
      appToast.success('已删除')
      onDeleted?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveChapter = async () => {
    if (!selectedChapterId) return
    setSavingChapter(true)
    try {
      const updated = await updateCatalogChapter(novel.id, selectedChapterId, {
        title: chapterTitle.trim(),
        content: chapterContent,
      })
      setChapterDetail(updated)
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === updated.id
            ? {
                ...ch,
                title: updated.title,
                wordCount: updated.wordCount,
              }
            : ch,
        ),
      )
      appToast.success('章节已保存')
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存章节失败')
    } finally {
      setSavingChapter(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!selectedChapterId || !chapterDetail) return
    if (!window.confirm(`确定删除章节「${chapterDetail.title}」？`)) return
    setDeleting(true)
    try {
      await deleteCatalogChapter(novel.id, selectedChapterId)
      appToast.success('章节已删除')
      const list = await loadChapters(novel.id)
      setSelectedChapterId(list[0]?.id ?? null)
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '删除章节失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="space-y-2 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-lg">{title || novel.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm">
              {progress ? (
                <p className="text-muted-foreground">
                  已入库 {progress.chapterCount} 章
                  {progress.chaptersExpected != null
                    ? ` · 目标 ${progress.chaptersDone ?? 0}/${progress.chaptersExpected} 章`
                    : ''}
                  {progress.complete ? ' · 已完成' : progress.latestJobStatus ? ` · 任务 ${progress.latestJobStatus}` : ''}
                </p>
              ) : (
                <p className="text-muted-foreground">{novel.chapterCount} 章</p>
              )}
              {progress?.latestJobId && onOpenJob ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => onOpenJob(progress.latestJobId!)}
                >
                  查看关联爬虫任务
                </Button>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                章节列表 ({chapters.length})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingMeta ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  加载中…
                </p>
              ) : chapters.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">暂无章节</p>
              ) : (
                <ul className="py-1">
                  {chapters.map((ch) => (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChapterId(ch.id)}
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                          selectedChapterId === ch.id && 'bg-primary/10 text-primary',
                        )}
                      >
                        <span className="line-clamp-2 font-medium">
                          {ch.sortOrder}. {ch.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{ch.wordCount} 字</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-6 space-y-3">
                <p className="text-sm font-semibold">书籍信息</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">书名</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">作者</label>
                    <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">封面 URL</label>
                    <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">来源 URL</label>
                    <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">简介</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={savingNovel} onClick={() => void handleSaveNovel()}>
                    {savingNovel ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 size-4" />
                    )}
                    保存书籍
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void handleDeleteNovel()}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    删除书籍
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">章节正文</p>
                  {selectedChapterId ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={savingChapter || loadingChapter}
                        onClick={() => void handleSaveChapter()}
                      >
                        {savingChapter ? (
                          <Loader2 className="mr-1.5 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 size-4" />
                        )}
                        保存章节
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting || loadingChapter}
                        onClick={() => void handleDeleteChapter()}
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        删除章节
                      </Button>
                    </div>
                  ) : null}
                </div>

                {!selectedChapterId ? (
                  <p className="text-sm text-muted-foreground">请从左侧选择章节</p>
                ) : loadingChapter ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    加载正文…
                  </p>
                ) : chapterDetail ? (
                  <div className="space-y-3">
                    <Input
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="章节标题"
                    />
                    <textarea
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                      rows={16}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed"
                      placeholder="章节正文"
                    />
                    <p className="text-xs text-muted-foreground">
                      {chapterContent.length} 字
                      {chapterDetail.sourceUrl ? (
                        <>
                          {' · '}
                          <a
                            href={chapterDetail.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-foreground"
                          >
                            原文链接
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
