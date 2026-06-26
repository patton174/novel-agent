import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { fetchWorkerJobsOverview, type WorkerJobsOverview } from '@/api/systemJobsApi'
import { AdminUploadRetryPanel } from '@/components/admin/AdminUploadRetryPanel'
import { BatchJobDispatchPanel } from '@/components/admin/BatchJobDispatchPanel'
import { BatchJobHistoryPanel } from '@/components/admin/BatchJobHistoryPanel'
import { AdminButtonOutline } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'

/** 上传解析运维：批量重试、MQ 投递与执行历史（业务操作，非定时任务目录）。 */
export default function UploadOpsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [overview, setOverview] = useState<WorkerJobsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispatchPrefill, setDispatchPrefill] = useState<{ jobType: string; itemIds: string[] } | null>(null)
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setOverview(await fetchWorkerJobsOverview())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:uploadOps.title')}
          description={t('admin:uploadOps.desc')}
          action={
            <AdminButtonOutline onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin:jobs.refresh')}
            </AdminButtonOutline>
          }
        />
        <AdminDataPanelBody className="space-y-4">
          {loading && !overview ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : (
            <>
              <AdminUploadRetryPanel
                onFillDispatch={(jobType, itemIds) => setDispatchPrefill({ jobType, itemIds })}
              />
              <BatchJobDispatchPanel
                jobTypes={overview?.batchJobTypes ?? []}
                dispatchAvailable={overview?.meta.batchDispatchAvailable ?? false}
                initialJobType={dispatchPrefill?.jobType}
                initialItemIds={dispatchPrefill?.itemIds}
                onDispatched={() => setHistoryRefreshToken((n) => n + 1)}
              />
              <BatchJobHistoryPanel refreshToken={historyRefreshToken} />
            </>
          )}
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
