import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { fetchBatchJobHistory, type BatchJobHistoryEntry } from '@/api/systemJobsApi'
import { BATCH_JOB_I18N } from '@/config/systemJobsCatalog'
import { AdminButtonOutline } from '@/components/admin/AdminFormControls'
import { PixelBadge } from '@/components/pixel'
import { Skeleton } from '@/components/ui/skeleton'

const PHASE_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  dispatched: 'default',
  completed: 'success',
  failed: 'warning',
}

export function BatchJobHistoryPanel({ refreshToken }: { refreshToken?: number }) {
  const { t } = useTranslation(['admin'])
  const [entries, setEntries] = useState<BatchJobHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await fetchBatchJobHistory(20))
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{t('admin:jobs.history.title')}</p>
        <AdminButtonOutline onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </AdminButtonOutline>
      </div>
      {loading && entries.length === 0 ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('admin:jobs.history.empty')}</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const i18n = BATCH_JOB_I18N[entry.jobType]
            const label = i18n ? t(i18n.labelKey) : entry.jobType
            const tone = PHASE_TONE[entry.phase] ?? 'muted'
            return (
              <div
                key={`${entry.batchId}-${entry.atEpochMs}-${entry.phase}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{label}</span>
                    <PixelBadge tone={tone}>
                      {t(`admin:jobs.history.phase.${entry.phase}` as 'admin:jobs.history.phase.dispatched')}
                    </PixelBadge>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {entry.batchId.slice(0, 8)}… · {entry.itemCount} items
                    {entry.detail ? ` · ${entry.detail}` : ''}
                  </p>
                </div>
                <time className="shrink-0 text-muted-foreground">
                  {new Date(entry.atEpochMs).toLocaleString()}
                </time>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
