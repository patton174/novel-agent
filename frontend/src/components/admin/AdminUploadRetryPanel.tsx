import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import { fetchUploadCrmFiles } from '@/api/uploadAdminApi'
import { AdminButtonGhost, AdminButtonOutline, AdminNotice } from '@/components/admin/AdminFormControls'
import { PixelBadge } from '@/components/pixel'
import { Skeleton } from '@/components/ui/skeleton'
import type { UploadedFile } from '@/types/file'

const UPLOAD_PARSE_RETRY = 'upload.parse.retry'

export function AdminUploadRetryPanel({
  onFillDispatch,
}: {
  onFillDispatch: (jobType: string, fileIds: string[]) => void
}) {
  const { t } = useTranslation(['admin'])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchUploadCrmFiles({ pageCurrent: 1, pageSize: 50, status: 'retryable' })
      setFiles(page.list)
      setTotal(page.totalCount)
      setSelected(new Set(page.list.map((f) => f.fileId)))
    } catch {
      setFiles([])
      setTotal(0)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedIds = useMemo(() => files.filter((f) => selected.has(f.fileId)).map((f) => f.fileId), [files, selected])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{t('admin:jobs.uploadRetry.title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('admin:jobs.uploadRetry.desc')}</p>
        </div>
        <AdminButtonOutline onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin:jobs.refresh')}
        </AdminButtonOutline>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : files.length === 0 ? (
        <AdminNotice>{t('admin:jobs.uploadRetry.empty')}</AdminNotice>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t('admin:jobs.uploadRetry.summary', { total, selected: selectedIds.length })}
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border/80 p-2">
            {files.map((file) => (
              <label
                key={file.fileId}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(file.fileId)}
                  onChange={() => toggle(file.fileId)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm text-foreground">{file.originalName}</span>
                    <PixelBadge tone={file.status === 'failed' ? 'warning' : 'muted'}>{file.status}</PixelBadge>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">{file.fileId}</p>
                  {file.parseError ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-destructive/80">{file.parseError}</p>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
          <AdminButtonGhost
            disabled={selectedIds.length === 0}
            onClick={() => onFillDispatch(UPLOAD_PARSE_RETRY, selectedIds)}
          >
            <ArrowDownToLine className="size-4" />
            {t('admin:jobs.uploadRetry.fillDispatch', { count: selectedIds.length })}
          </AdminButtonGhost>
        </>
      )}
    </div>
  )
}
