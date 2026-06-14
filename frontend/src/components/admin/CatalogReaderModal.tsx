import { useTranslation } from 'react-i18next'
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
import { AppModalShell } from '@/components/ui/AppModalShell'
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/appDialog'
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
  const { t } = useTranslation(['admin', 'common'])
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
      .catch((err) => appToast.error(err instanceof Error ? err.message : t('admin:catalog.loadTOCFail')))
      .finally(() => setLoadingList(false))
  }, [open, novel, initialChapterId, loadChapters, t])

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
        if (!cancelled) appToast.error(err instanceof Error ? err.message : t('admin:catalog.loadChapterFail'))
      })
      .finally(() => {
        if (!cancelled) setLoadingChapter(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, novel, selectedChapterId, t])

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
      appToast.success(t('admin:catalog.chapterSaved'))
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('common:feedback.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!selectedChapterId || !chapterDetail) return
    if (!(await confirmAction({
      title: t('admin:catalog.deleteChapterTitle'),
      description: t('admin:catalog.deleteChapterDesc', { title: chapterDetail.title }),
      confirmLabel: t('admin:catalog.deleteBtn'),
      danger: true,
    }))) return
    setDeleting(true)
    try {
      await deleteCatalogChapter(novel.id, selectedChapterId)
      appToast.success(t('admin:catalog.chapterDeleted'))
      const list = await loadChapters(novel.id)
      setSelectedChapterId(list[0]?.id ?? null)
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:catalog.deleteFail'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="memory"
      showCloseButton={false}
      className="gap-0 overflow-hidden p-0 sm:max-w-5xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      header={
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
          <div className="min-w-0 pr-2">
            <DialogTitle className="truncate text-base font-semibold">{novel.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {t('admin:catalog.totalChapters', { count: chapters.length })} · {novel.author || t('admin:catalog.unknownAuthor')}
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
              {editMode ? t('admin:catalog.read') : t('admin:catalog.edit')}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t('common:cta.close')}>
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </div>
      }
    >
      <div className="relative grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
          {mobileChapterOpen ? (
            <button
              type="button"
              aria-label={t('admin:catalog.closeTOC')}
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
            <div className="flex items-center justify-between border-b border-border px-3 py-2 md:hidden">
              <span className="text-sm font-medium">{t('admin:catalog.toc')}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('admin:catalog.closeTOC')}
                onClick={() => setMobileChapterOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('admin:catalog.searchChapter')}
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {t('admin:catalog.loadingTOC')}
                </p>
              ) : filteredChapters.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {query.trim() ? t('admin:catalog.noMatchChapter') : t('admin:catalog.emptyChapter')}
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
                          {t('admin:catalog.wordCount', { count: ch.wordCount })}
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
                {t('admin:catalog.tocLabel')}
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {chapterDetail?.title ?? (selectedChapterId ? t('admin:catalog.loadingContent') : t('admin:catalog.selectChapter'))}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
            {!selectedChapterId ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                {t('admin:catalog.pleaseSelectChapter')}
              </div>
            ) : loadingChapter ? (
              <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t('admin:catalog.loadingContent')}
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
                    {t('admin:catalog.wordCount', { count: chapterContent.length })}
                    {chapterDetail.sourceUrl ? (
                      <>
                        {' · '}
                        <a
                          href={chapterDetail.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-foreground"
                        >
                          {t('admin:catalog.originalSource')}
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
                        {chapterContent || t('admin:catalog.emptyContent')}
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
                      {t('admin:catalog.deleteChapterTitle')}
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
                      {t('admin:catalog.saveChapter')}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
    </AppModalShell>
  )
}
