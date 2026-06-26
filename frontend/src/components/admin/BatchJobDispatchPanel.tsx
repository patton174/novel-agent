import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import {
  AdminButton,
  AdminField,
  AdminFormActions,
  AdminNotice,
  AdminSelect,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import { dispatchBatchJob, parseBatchItemIds, type BatchJobTypeItem } from '@/api/systemJobsApi'
import { BATCH_JOB_I18N } from '@/config/systemJobsCatalog'
import { appToast } from '@/stores/appToastStore'

export function BatchJobDispatchPanel({
  jobTypes,
  dispatchAvailable,
  initialJobType,
  initialItemIds,
  onDispatched,
}: {
  jobTypes: BatchJobTypeItem[]
  dispatchAvailable: boolean
  initialJobType?: string
  initialItemIds?: string[]
  onDispatched?: () => void
}) {
  const { t } = useTranslation(['admin'])
  const [jobType, setJobType] = useState(initialJobType ?? jobTypes[0]?.jobType ?? '')
  const [rawIds, setRawIds] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialJobType) {
      setJobType(initialJobType)
    }
  }, [initialJobType])

  useEffect(() => {
    if (initialItemIds && initialItemIds.length > 0) {
      setRawIds(initialItemIds.join('\n'))
    }
  }, [initialItemIds])

  const itemIds = useMemo(() => parseBatchItemIds(rawIds), [rawIds])
  const selectedI18n = BATCH_JOB_I18N[jobType]

  async function handleDispatch() {
    if (!jobType) {
      appToast.error(t('admin:jobs.dispatch.pickType'))
      return
    }
    if (itemIds.length === 0) {
      appToast.error(t('admin:jobs.dispatch.emptyIds'))
      return
    }
    setSubmitting(true)
    try {
      await dispatchBatchJob({ jobType, itemIds })
      appToast.success(t('admin:jobs.dispatch.success', { count: itemIds.length }))
      setRawIds('')
      onDispatched?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:jobs.dispatch.fail'))
    } finally {
      setSubmitting(false)
    }
  }

  if (jobTypes.length === 0) {
    return <AdminNotice>{t('admin:jobs.dispatch.noHandlers')}</AdminNotice>
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{t('admin:jobs.dispatch.title')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('admin:jobs.dispatch.desc')}</p>
      </div>
      {!dispatchAvailable ? <AdminNotice>{t('admin:jobs.dispatch.mqUnavailable')}</AdminNotice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label={t('admin:jobs.dispatch.jobType')} layout="form">
          <AdminSelect value={jobType} onChange={(e) => setJobType(e.target.value)} disabled={submitting}>
            {jobTypes.map((jt) => {
              const label = BATCH_JOB_I18N[jt.jobType]
              return (
                <option key={jt.jobType} value={jt.jobType}>
                  {label ? t(label.labelKey) : jt.jobType}
                </option>
              )
            })}
          </AdminSelect>
        </AdminField>
        <AdminField
          label={t('admin:jobs.dispatch.itemCount')}
          hint={t('admin:jobs.dispatch.itemCountHint', { count: itemIds.length })}
          layout="form"
        >
          <AdminTextInput value={String(itemIds.length)} readOnly className="font-mono" />
        </AdminField>
      </div>
      {selectedI18n ? <p className="text-xs text-muted-foreground">{t(selectedI18n.descKey)}</p> : null}
      <AdminField label={t('admin:jobs.dispatch.itemIds')} hint={t('admin:jobs.dispatch.itemIdsHint')} layout="form">
        <textarea
          className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={rawIds}
          onChange={(e) => setRawIds(e.target.value)}
          placeholder={t('admin:jobs.dispatch.itemIdsPlaceholder')}
          disabled={submitting || !dispatchAvailable}
        />
      </AdminField>
      <AdminFormActions>
        <AdminButton
          onClick={() => void handleDispatch()}
          disabled={submitting || !dispatchAvailable || itemIds.length === 0}
        >
          <Send className="size-4" />
          {submitting ? t('admin:jobs.dispatch.submitting') : t('admin:jobs.dispatch.submit')}
        </AdminButton>
      </AdminFormActions>
    </div>
  )
}
