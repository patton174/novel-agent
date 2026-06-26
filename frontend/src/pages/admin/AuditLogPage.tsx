import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAuditLogs, type AuditLogItem } from '@/api/billingAdminApi'
import {
  AdminButtonOutline,
  AdminField,
  AdminSelect,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import { AdminResponsivePixelTable } from '@/components/admin/AdminResponsivePixelTable'
import { AuditLogDetailModal } from '@/components/admin/AuditLogDetailModal'
import {
  PixelCellMono,
  PixelCellStack,
  PIXEL_MOBILE_CARD,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import { cn } from '@/lib/utils'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelHeader,
  AdminDataToolbar,
} from '@/components/layout/AdminDataLayout'
import { ProPagination } from '@/components/pro/ProPagination'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

export default function AuditLogPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()

  const ACTION_OPTIONS = [
    { value: '', label: t('admin:auditLog.actionAll') },
    { value: 'plan.create', label: t('admin:auditLog.actionPlanCreate') },
    { value: 'plan.update', label: t('admin:auditLog.actionPlanUpdate') },
    { value: 'plan.delete', label: t('admin:auditLog.actionPlanDelete') },
    { value: 'plan.activate', label: t('admin:auditLog.actionPlanActivate') },
    { value: 'payment_order.sync', label: t('admin:auditLog.actionPaymentSync') },
    { value: 'payment_order.fulfill', label: t('admin:auditLog.actionPaymentFulfill') },
    { value: 'payment_order.expire', label: t('admin:auditLog.actionPaymentExpire') },
    { value: 'user.subscription.change', label: t('admin:auditLog.actionSubChange') },
    { value: 'user.quota.override', label: t('admin:auditLog.actionQuotaOverride') },
    { value: 'user.role.change', label: t('admin:auditLog.actionRoleChange') },
    { value: 'site.content.update', label: t('admin:auditLog.actionSiteContent') },
    { value: 'site.settings.update', label: t('admin:auditLog.actionSiteSettings') },
  ]
  const [logs, setLogs] = useState<AuditLogItem[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [action, setAction] = useState('')
  const [actorIdInput, setActorIdInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLog, setDetailLog] = useState<AuditLogItem | null>(null)

  const load = useCallback(async (page: number, actionFilter: string, actorFilter: string) => {
    setLoading(true)
    try {
      const actorId = actorFilter.trim() ? Number(actorFilter) : undefined
      const data = await fetchAuditLogs({
        pageCurrent: page,
        pageSize: PAGE_SIZE,
        action: actionFilter || undefined,
        actorId: Number.isFinite(actorId) ? actorId : undefined,
      })
      setLogs(data.list)
      setTotalCount(data.totalCount)
      setPageCurrent(data.pageCurrent)
    } catch (err) {
      setLogs([])
      appToast.error(err instanceof Error ? err.message : t('admin:auditLog.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load(pageCurrent, action, actorIdInput)
  }, [load, pageCurrent, action, actorIdInput])

  const list = logs ?? []
  const initialLoading = loading && logs === null

  const columns = useMemo((): PixelColumn<AuditLogItem>[] => {
    return [
      {
        key: 'createdAt',
        header: t('admin:auditLog.colTime'),
        render: (log) => (
          <PixelCellMono className="whitespace-nowrap text-muted-foreground">
            {new Date(log.createdAt).toLocaleString('zh-CN')}
          </PixelCellMono>
        ),
      },
      {
        key: 'action',
        header: t('admin:auditLog.colAction'),
        render: (log) => <PixelCellMono>{log.action}</PixelCellMono>,
      },
      {
        key: 'actorId',
        header: t('admin:auditLog.colActor'),
        className: 'tabular-nums',
        render: (log) => log.actorId,
      },
      {
        key: 'target',
        header: t('admin:auditLog.colTarget'),
        render: (log) => (
          <PixelCellStack
            title={log.targetType ?? '—'}
            subtitle={log.targetId ? `#${log.targetId}` : undefined}
          />
        ),
      },
      {
        key: 'changes',
        header: t('admin:auditLog.colChanges'),
        render: (log) =>
          log.beforeJson || log.afterJson ? (
            <PixelTableActionButton onClick={() => setDetailLog(log)}>
              {t('admin:auditLog.viewJson')}
            </PixelTableActionButton>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">—</span>
          ),
      },
    ]
  }, [t])

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:auditLog.listTitle')}
          description={t('admin:auditLog.listDesc', { count: totalCount })}
        />
        <AdminDataToolbar>
          <AdminField label={t('admin:auditLog.colAction')}>
            <AdminSelect
              value={action}
              onChange={(e) => {
                setPageCurrent(1)
                setAction(e.target.value)
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label={t('admin:auditLog.colActor')}>
            <AdminTextInput
              placeholder={t('admin:auditLog.actorPlaceholder')}
              value={actorIdInput}
              onChange={(e) => {
                setPageCurrent(1)
                setActorIdInput(e.target.value)
              }}
            />
          </AdminField>
        </AdminDataToolbar>

        <AdminResponsivePixelTable
          columns={columns}
          data={list}
          rowKey="id"
          loading={loading && !initialLoading}
          initialLoading={initialLoading}
          emptyText={t('admin:auditLog.empty')}
          skeletonRows={8}
          renderMobileCard={(log) => (
            <article className={cn(PIXEL_MOBILE_CARD, 'p-4')}>
              <PixelCellMono className="text-muted-foreground">
                {new Date(log.createdAt).toLocaleString('zh-CN')}
              </PixelCellMono>
              <p className="mt-1 font-mono text-sm font-bold">{log.action}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t('admin:auditLog.colActor')}</dt>
                  <dd className="tabular-nums">{log.actorId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('admin:auditLog.colTarget')}</dt>
                  <dd className="truncate">
                    {log.targetType ?? '—'}
                    {log.targetId ? ` #${log.targetId}` : ''}
                  </dd>
                </div>
              </dl>
              {log.beforeJson || log.afterJson ? (
                <AdminButtonOutline className="mt-3 w-full" onClick={() => setDetailLog(log)}>
                  {t('admin:auditLog.viewDetails')}
                </AdminButtonOutline>
              ) : null}
            </article>
          )}
        />
      </AdminDataPanel>

      <ProPagination
        page={pageCurrent}
        pageSize={PAGE_SIZE}
        total={totalCount}
        disabled={loading}
        onPageChange={setPageCurrent}
      />

      <AuditLogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />
    </AdminDataPage>
  )
}
