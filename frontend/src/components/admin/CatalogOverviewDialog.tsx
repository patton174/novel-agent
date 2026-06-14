import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react'
import { PanelLoadingSkeleton } from '@/components/loading/PageSkeletons'
import {
  deleteCatalogNovel,
  fetchCatalogProgress,
  updateCatalogNovel,
  type CatalogNovel,
  type CatalogNovelProgress,
} from '@/api/catalogAdminApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/appDialog'
import { appToast } from '@/stores/appToastStore'

interface CatalogOverviewDialogProps {
  novel: CatalogNovel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRead?: (novel: CatalogNovel) => void
  onUpdated?: () => void
  onDeleted?: () => void
  onOpenJob?: (jobId: string) => void
}

export function CatalogOverviewDialog({
  novel,
  open,
  onOpenChange,
  onRead,
  onUpdated,
  onDeleted,
  onOpenJob,
}: CatalogOverviewDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [progress, setProgress] = useState<CatalogNovelProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  const resetForms = useCallback((n: CatalogNovel) => {
    setTitle(n.title)
    setAuthor(n.author ?? '')
    setDescription(n.description ?? '')
    setCoverUrl(n.coverUrl ?? '')
    setSourceUrl(n.sourceUrl ?? '')
  }, [])

  useEffect(() => {
    if (!open || !novel) {
      setEditing(false)
      return
    }
    resetForms(novel)
    setLoading(true)
    void fetchCatalogProgress(novel.id)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setLoading(false))
  }, [open, novel, resetForms])

  if (!novel) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCatalogNovel(novel.id, {
        title: title.trim(),
        author: author.trim(),
        description,
        coverUrl: coverUrl.trim(),
        sourceUrl: sourceUrl.trim(),
      })
      appToast.success(t('admin:catalog.novelSaved'))
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('common:feedback.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirmAction({
      title: t('admin:catalog.deleteTitle'),
      description: t('admin:catalog.deleteNovelDesc', { title: title || novel.title }),
      confirmLabel: t('admin:catalog.deleteBtn'),
      danger: true,
    }))) return
    setDeleting(true)
    try {
      await deleteCatalogNovel(novel.id)
      appToast.success(t('admin:catalog.deleted'))
      onDeleted?.()
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
      size="reader"
      className="gap-0 overflow-hidden p-0"
      bodyClassName="overflow-y-auto p-0"
      header={
        <div className="flex gap-4 border-b border-border bg-muted/30 p-5">
          {coverUrl || novel.coverUrl ? (
            <img
              src={(coverUrl || novel.coverUrl) ?? undefined}
              alt=""
              className="size-20 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-border"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
              <BookOpen className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1 text-left">
            <DialogTitle className="text-lg leading-snug">{title || novel.title}</DialogTitle>
            <DialogDescription className="text-sm">
              {author || novel.author || t('admin:catalog.unknownAuthor')} · {t('admin:catalog.chapterCount', { count: novel.chapterCount })}
            </DialogDescription>
          </div>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {loading ? (
          <PanelLoadingSkeleton rows={3} />
        ) : progress ? (
          <div
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm',
              progress.complete
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5',
            )}
          >
            <p className="font-medium">{progress.complete ? t('admin:catalog.crawlComplete') : t('admin:catalog.crawling')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('admin:catalog.crawledCount', { count: progress.chapterCount })}
              {progress.chaptersExpected != null
                ? t('admin:catalog.crawlProgress', { done: progress.chaptersDone ?? 0, total: progress.chaptersExpected })
                : ''}
              {progress.latestJobStatus ? t('admin:catalog.jobStatus', { status: progress.latestJobStatus }) : ''}
            </p>
            {progress.latestJobId && onOpenJob ? (
              <button
                type="button"
                className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => onOpenJob(progress.latestJobId!)}
              >
                {t('admin:catalog.viewJob')}
              </button>
            ) : null}
          </div>
        ) : null}

        {!editing ? (
          <>
            {description || novel.description ? (
              <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                {description || novel.description}
              </p>
            ) : null}
            {sourceUrl || novel.sourceUrl ? (
              <a
                href={(sourceUrl || novel.sourceUrl) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{sourceUrl || novel.sourceUrl}</span>
              </a>
            ) : null}
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin:catalog.novelTitle')}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin:catalog.author')}</label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin:catalog.coverUrl')}</label>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin:catalog.sourceUrl')}</label>
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t('admin:catalog.description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
        {!editing ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1.5 size-3.5" />
                {t('admin:catalog.edit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
            <Button type="button" onClick={() => onRead?.(novel)}>
              <BookOpen className="mr-2 size-4" />
              {t('admin:catalog.readTOC')}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForms(novel)
                setEditing(false)
              }}
            >
              {t('common:cta.cancel')}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('common:cta.save')}
            </Button>
          </>
        )}
      </div>
    </AppModalShell>
  )
}
