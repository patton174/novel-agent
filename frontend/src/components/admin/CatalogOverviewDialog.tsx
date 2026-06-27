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
import {
  AdminButton,
  AdminButtonOutline,
  AdminField,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import {
  PIXEL_INPUT,
  PIXEL_PANEL,
  PixelTableActionBar,
  PixelTableActionButton,
  PixelTableActionIconButton,
} from '@/components/pixel'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
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
}

export function CatalogOverviewDialog({
  novel,
  open,
  onOpenChange,
  onRead,
  onUpdated,
  onDeleted,
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
              className="size-20 shrink-0 rounded-md border border-[var(--pixel-border-strong)] object-cover"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-md border border-[var(--pixel-border-strong)] bg-muted">
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
          <div className={cn(PIXEL_PANEL, 'text-sm border-border/60 bg-muted/20')}>
            <p className="font-medium">{t('admin:catalog.chapterCount', { count: progress.chapterCount })}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {progress.complete ? t('admin:catalog.parseReady') : t('admin:catalog.parsePending')}
            </p>
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
            <AdminField layout="form" label={t('admin:catalog.novelTitle')}>
              <AdminTextInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </AdminField>
            <AdminField layout="form" label={t('admin:catalog.author')}>
              <AdminTextInput value={author} onChange={(e) => setAuthor(e.target.value)} />
            </AdminField>
            <AdminField layout="form" label={t('admin:catalog.coverUrl')}>
              <AdminTextInput value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </AdminField>
            <AdminField layout="form" label={t('admin:catalog.sourceUrl')}>
              <AdminTextInput value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </AdminField>
            <AdminField layout="form" label={t('admin:catalog.description')}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cn(PIXEL_INPUT, 'min-h-[5rem] resize-y py-2')}
              />
            </AdminField>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t-2 border-foreground/15 bg-muted/20 px-5 py-3">
        {!editing ? (
          <>
            <PixelTableActionBar>
              <PixelTableActionButton variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                {t('admin:catalog.edit')}
              </PixelTableActionButton>
              <PixelTableActionIconButton
                variant="danger"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </PixelTableActionIconButton>
            </PixelTableActionBar>
            <AdminButton size="sm" onClick={() => onRead?.(novel)}>
              <BookOpen className="size-4" />
              {t('admin:catalog.readTOC')}
            </AdminButton>
          </>
        ) : (
          <>
            <AdminButtonOutline
              size="sm"
              onClick={() => {
                resetForms(novel)
                setEditing(false)
              }}
            >
              {t('common:cta.cancel')}
            </AdminButtonOutline>
            <AdminButton size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('common:cta.save')}
            </AdminButton>
          </>
        )}
      </div>
    </AppModalShell>
  )
}
