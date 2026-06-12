import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, List, Loader2, Pencil, Save, Search, Trash2, X } from 'lucide-react'
import {
  deleteCatalogChapter,
  fetchCatalogChapter,
  fetchCatalogChapters,
  updateCatalogChapter,
  type CatalogChapterDetail,
  type CatalogChapterSummary,
  type CatalogNovel,
} from '@/api/catalogAdminApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { APP_MODAL_READER } from '@/lib/appModalClasses'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/confirmDialogStore'
import { appToast } from '@/stores/appToastStore'

interface CatalogReaderModalProps {
  novel: CatalogNovel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialChapterId?: string | null
  onUpdated?: () => void
}

export function CatalogReaderModal({
  novel,
  open,
  onOpenChange,
  initialChapterId,
  onUpdated,
}: CatalogReaderModalProps) {
  const [chapters, setChapters] = useState<CatalogChapterSummary[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [chapterDetail, setChapterDetail] = useState<CatalogChapterDetail | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterContent, setChapterContent] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [mobileChapterOpen, setMobileChapterOpen] = useState(false)

  useEffect(() => {
    if (!open) setMobileChapterOpen(false)
  }, [open])

  const loadChapters = useCallback(async (novelId: string) => {
    const list = await fetchCatalogChapters(novelId)
    setChapters(list)
    return list
  }, [])

  useEffect(() => {
    if (!open || !novel) return
    setEditMode(false)
    setQuery('')
    setLoadingList(true)
    void loadChapters(novel.id)
      .then((list) => {
        const pick =
          (initialChapterId && list.find((c) => c.id === initialChapterId)?.id) ||
          list[0]?.id ||
          null
        setSelectedChapterId(pick)
      })
      .catch((err) => appToast.error(err instanceof Error ? err.message : '加载目录失败'))
      .finally(() => setLoadingList(false))
  }, [open, novel, initialChapterId, loadChapters])

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
        if (!cancelled) appToast.error(err instanceof Error ? err.message : '加载章节失败')
      })
      .finally(() => {
        if (!cancelled) setLoadingChapter(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, novel, selectedChapterId])

  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter((c) => c.title.toLowerCase().includes(q))
  }, [chapters, query])

  if (!novel) return null

  const handleSaveChapter = async () => {
    if (!selectedChapterId) return
    setSaving(true)
    try {
      const updated = await updateCatalogChapter(novel.id, selectedChapterId, {
        title: chapterTitle.trim(),
        content: chapterContent,
      })
      setChapterDetail(updated)
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === updated.id
            ? { ...ch, title: updated.title, wordCount: updated.wordCount }
            : ch,
        ),
      )
      appToast.success('章节已保存')
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!selectedChapterId || !chapterDetail) return
    if (!(await confirmAction({
      title: '删除章节',
      description: `确定删除章节「${chapterDetail.title}」？`,
      confirmLabel: '删除',
      danger: true,
    }))) return
    setDeleting(true)
    try {
      await deleteCatalogChapter(novel.id, selectedChapterId)
      appToast.success('章节已删除')
      const list = await loadChapters(novel.id)
      setSelectedChapterId(list[0]?.id ?? null)
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl', APP_MODAL_READER)} showCloseButton={false}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
          <div className="min-w-0 pr-2">
            <DialogTitle className="truncate text-base font-semibold">{novel.title}</DialogTitle>
            <DialogDescription className="text-xs">
              共 {chapters.length} 章 · {novel.author || '未知作者'}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={editMode ? 'secondary' : 'outline'}
              onClick={() => setEditMode((v) => !v)}
            >
              <Pencil className="mr-1.5 size-3.5" />
              {editMode ? '阅读' : '编辑'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="关闭">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="relative grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
          {mobileChapterOpen ? (
            <button
              type="button"
              aria-label="关闭目录"
              className="absolute inset-0 z-10 bg-black/40 md:hidden"
              onClick={() => setMobileChapterOpen(false)}
            />
          ) : null}
          <aside
            className={cn(
              'flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r',
              'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:w-[min(280px,88vw)] max-md:border-r max-md:bg-background max-md:shadow-xl',
              !mobileChapterOpen && 'max-md:hidden',
            )}
          >
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索章节"
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
            <div className="min-h-0 max-h-[40vh] flex-1 overflow-y-auto md:max-h-none">
              {loadingList ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  加载目录…
                </p>
              ) : filteredChapters.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {query.trim() ? '无匹配章节' : '暂无章节'}
                </p>
              ) : (
                <ul className="py-1">
                  {filteredChapters.map((ch) => (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChapterId(ch.id)
                          setMobileChapterOpen(false)
                        }}
                        className={cn(
                          'flex w-full flex-col gap-0.5 border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                          selectedChapterId === ch.id &&
                            'border-primary bg-primary/5 font-medium text-primary',
                        )}
                      >
                        <span className="line-clamp-2">
                          <span className="mr-1.5 tabular-nums text-xs text-muted-foreground">
                            {ch.sortOrder}
                          </span>
                          {ch.title}
                        </span>
                        <span className="pl-5 text-[11px] text-muted-foreground">
                          {ch.wordCount.toLocaleString()} 字
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 md:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                onClick={() => setMobileChapterOpen(true)}
              >
                <List className="mr-1.5 size-3.5" />
                目录
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {chapterDetail?.title ?? (selectedChapterId ? '加载中…' : '选择章节')}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
            {!selectedChapterId ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                请从目录选择章节
              </div>
            ) : loadingChapter ? (
              <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                加载正文…
              </div>
            ) : chapterDetail ? (
              <>
                <div className="shrink-0 border-b border-border px-6 py-4">
                  {editMode ? (
                    <Input
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold leading-snug tracking-tight">
                      {chapterDetail.title}
                    </h2>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chapterContent.length.toLocaleString()} 字
                    {chapterDetail.sourceUrl ? (
                      <>
                        {' · '}
                        <a
                          href={chapterDetail.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-foreground"
                        >
                          原文
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  {editMode ? (
                    <textarea
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                      rows={20}
                      className="min-h-[50vh] w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed"
                    />
                  ) : (
                    <article className="mx-auto max-w-prose">
                      <div className="whitespace-pre-wrap text-[15px] leading-[1.85] tracking-wide text-foreground/95">
                        {chapterContent || '（空正文）'}
                      </div>
                    </article>
                  )}
                </div>

                {editMode ? (
                  <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={deleting}
                      onClick={() => void handleDeleteChapter()}
                    >
                      {deleting ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 size-4" />
                      )}
                      删除章节
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSaveChapter()}
                    >
                      {saving ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 size-4" />
                      )}
                      保存章节
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
