import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react'
import {
  deleteCatalogNovel,
  fetchCatalogProgress,
  updateCatalogNovel,
  type CatalogNovel,
  type CatalogNovelProgress,
} from '@/api/catalogAdminApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
      appToast.success('书籍信息已保存')
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="relative h-28 bg-gradient-to-br from-primary/20 via-muted to-background">
          {coverUrl || novel.coverUrl ? (
            <img
              src={(coverUrl || novel.coverUrl) ?? undefined}
              alt=""
              className="absolute bottom-0 left-6 size-24 translate-y-1/2 rounded-xl border-4 border-background object-cover shadow-lg"
            />
          ) : (
            <div className="absolute bottom-0 left-6 flex size-24 translate-y-1/2 items-center justify-center rounded-xl border-4 border-background bg-muted shadow-lg">
              <BookOpen className="size-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-14">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl leading-snug">{title || novel.title}</DialogTitle>
            <DialogDescription className="text-sm">
              {author || novel.author || '未知作者'}
              {' · '}
              {novel.chapterCount} 章
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载进度…
            </p>
          ) : progress ? (
            <div
              className={cn(
                'mt-4 rounded-lg border px-3 py-2 text-sm',
                progress.complete
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5',
              )}
            >
              <p className="font-medium">
                {progress.complete ? '爬取已完成' : '爬取进行中'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                已入库 {progress.chapterCount} 章
                {progress.chaptersExpected != null
                  ? ` · 进度 ${progress.chaptersDone ?? 0}/${progress.chaptersExpected}`
                  : ''}
                {progress.latestJobStatus ? ` · 任务 ${progress.latestJobStatus}` : ''}
              </p>
              {progress.latestJobId && onOpenJob ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="mt-1 h-auto p-0 text-xs"
                  onClick={() => onOpenJob(progress.latestJobId!)}
                >
                  查看关联爬虫任务
                </Button>
              ) : null}
            </div>
          ) : null}

          {!editing ? (
            <>
              {description || novel.description ? (
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                  {description || novel.description}
                </p>
              ) : null}
              {sourceUrl || novel.sourceUrl ? (
                <a
                  href={(sourceUrl || novel.sourceUrl) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{sourceUrl || novel.sourceUrl}</span>
                </a>
              ) : null}
            </>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">书名</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">作者</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">封面 URL</label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">来源 URL</label>
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">简介</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            {!editing ? (
              <>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    onRead?.(novel)
                    onOpenChange(false)
                  }}
                >
                  <BookOpen className="mr-2 size-4" />
                  阅读 / 目录
                </Button>
                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-1.5 size-4" />
                    编辑信息
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    resetForms(novel)
                    setEditing(false)
                  }}
                >
                  取消
                </Button>
                <Button type="button" className="flex-1" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  保存
                </Button>
              </div>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
