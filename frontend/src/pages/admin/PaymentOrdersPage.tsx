import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchAdminPaymentOrderDetail,
  fetchAdminPaymentOrders,
  formatOrderAmount,
  type AdminPaymentOrder,
  type AdminPaymentOrderDetail,
} from '@/api/billingAdminApi'
import { PaymentOrderDetailModal } from '@/components/admin/PaymentOrderDetailModal'
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/layout/ResponsiveTable'
import { AdminField, AdminSelect, AdminTextInput, AdminButtonGhost, AdminStatusBadge } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelHeader,
  AdminDataToolbar,
} from '@/components/layout/AdminDataLayout'
import { ProPagination } from '@/components/pro/ProPagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 20

const STATUS_CLASS: Record<string, string> = {
  NEW: 'bg-sky-100 text-sky-900',
  DONE: 'bg-emerald-100 text-emerald-900',
  EXPIRED: 'bg-muted text-muted-foreground',
  REFUND: 'bg-amber-100 text-amber-900',
}

export default function PaymentOrdersPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [searchParams, setSearchParams] = useSearchParams()

  const STATUS_OPTIONS = [
    { value: '', label: t('admin:paymentOrders.statusAll') },
    { value: 'NEW', label: 'NEW' },
    { value: 'DONE', label: 'DONE' },
    { value: 'EXPIRED', label: 'EXPIRED' },
    { value: 'REFUND', label: 'REFUND' },
  ]

  const [orders, setOrders] = useState<AdminPaymentOrder[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [status, setStatus] = useState('')
  const [userIdInput, setUserIdInput] = useState('')
  const [planCode, setPlanCode] = useState('')
  const [planIdFilter, setPlanIdFilter] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<AdminPaymentOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const planId = searchParams.get('planId')?.trim() ?? ''
    const statusParam = searchParams.get('status')?.trim().toUpperCase() ?? ''
    setPlanIdFilter(planId)
    if (statusParam) {
      setStatus(statusParam)
    }
    if (planId || statusParam) {
      setPageCurrent(1)
    }
  }, [searchParams])

  const load = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const userId = userIdInput.trim() ? Number(userIdInput) : undefined
        const planId = planIdFilter.trim() ? Number(planIdFilter) : undefined
        const data = await fetchAdminPaymentOrders({
          pageCurrent: page,
          pageSize: PAGE_SIZE,
          status: status || undefined,
          userId: Number.isFinite(userId) ? userId : undefined,
          planId: Number.isFinite(planId) ? planId : undefined,
          planCode: planCode || undefined,
          orderQuery: orderQuery || undefined,
        })
        setOrders(data.list)
        setTotalCount(data.totalCount)
        setPageCurrent(data.pageCurrent)
      } catch (err) {
        setOrders([])
        appToast.error(err instanceof Error ? err.message : t('admin:paymentOrders.loadFail'))
      } finally {
        setLoading(false)
      }
    },
    [orderQuery, planCode, planIdFilter, status, t, userIdInput],
  )

  useEffect(() => {
    void load(pageCurrent)
  }, [load, pageCurrent])

  const openDetail = async (order: AdminPaymentOrder, syncRemote = false) => {
    setDetailLoading(true)
    setDetail({
      ...order,
      contactInfo: '',
      callbackJson: null,
      remoteStatus: null,
      remoteSnapshot: null,
    })
    try {
      const full = await fetchAdminPaymentOrderDetail(order.id, syncRemote)
      setDetail(full)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:paymentOrders.loadDetailFail'))
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const list = orders ?? []
  const initialLoading = loading && orders === null

  const columns: ResponsiveTableColumn<AdminPaymentOrder>[] = [
    {
      key: 'id',
      header: 'ID',
      cellClassName: 'tabular-nums font-mono text-sm',
      renderCell: (row) => row.id,
    },
    {
      key: 'idrOrderId',
      header: t('admin:paymentOrders.colIdrOrder'),
      cellClassName: 'max-w-[140px] truncate font-mono text-sm',
      renderCell: (row) => (
        <span title={row.idrOrderId}>{row.idrOrderId.slice(0, 12)}…</span>
      ),
    },
    {
      key: 'userId',
      header: t('admin:paymentOrders.userId'),
      cellClassName: 'tabular-nums',
      renderCell: (row) => row.userId,
    },
    {
      key: 'plan',
      header: t('admin:paymentOrders.colPlan'),
      renderCell: (row) => (
        <span>
          {row.planName}
          <span className="ml-1 font-mono text-xs text-muted-foreground">{row.planCode}</span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('admin:paymentOrders.colAmount'),
      cellClassName: 'tabular-nums whitespace-nowrap',
      renderCell: (row) => formatOrderAmount(row.amountCents, row.currency),
    },
    {
      key: 'status',
      header: t('admin:paymentOrders.colStatus'),
      renderCell: (row) => (
        <AdminStatusBadge tone={row.status === 'DONE' ? 'success' : row.status === 'NEW' ? 'info' : row.status === 'REFUND' ? 'warning' : 'neutral'}>
          {row.status}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'createdAt',
      header: t('admin:paymentOrders.colCreated'),
      cellClassName: 'whitespace-nowrap text-sm text-muted-foreground',
      renderCell: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
    },
    {
      key: 'paidAt',
      header: t('admin:paymentOrders.colPaidAt'),
      cellClassName: 'whitespace-nowrap text-sm text-muted-foreground',
      renderCell: (row) =>
        row.paidAt ? new Date(row.paidAt).toLocaleString('zh-CN') : '—',
    },
    {
      key: 'actions',
      header: t('admin:paymentOrders.colActions'),
      renderCell: (row) => (
        <AdminButtonGhost onClick={() => void openDetail(row)}>
          {t('admin:paymentOrders.viewDetail')}
        </AdminButtonGhost>
      ),
    },
  ]

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:paymentOrders.title')}
          description={t('admin:paymentOrders.desc')}
        />
        {planIdFilter ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{t('admin:paymentOrders.filteredByPlan')}</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">#{planIdFilter}</span>
            <AdminButtonGhost
              onClick={() => {
                setPlanIdFilter('')
                setSearchParams({})
              }}
            >
              {t('admin:paymentOrders.clearPlanFilter')}
            </AdminButtonGhost>
            <AdminButtonGhost asChild>
              <Link to="/admin/plans">{t('admin:paymentOrders.backToPlans')}</Link>
            </AdminButtonGhost>
          </div>
        ) : null}
        <AdminDataToolbar>
          <AdminField label={t('admin:paymentOrders.filterStatus')}>
            <AdminSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPageCurrent(1)
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label={t('admin:paymentOrders.userId')}>
            <AdminTextInput
              value={userIdInput}
              placeholder="123"
              onChange={(e) => {
                setUserIdInput(e.target.value)
                setPageCurrent(1)
              }}
            />
          </AdminField>
          <AdminField label={t('admin:paymentOrders.filterPlan')}>
            <AdminTextInput
              value={planCode}
              placeholder="pro"
              onChange={(e) => {
                setPlanCode(e.target.value)
                setPageCurrent(1)
              }}
            />
          </AdminField>
          <AdminField label={t('admin:paymentOrders.filterOrder')} className="sm:max-w-xs">
            <AdminTextInput
              value={orderQuery}
              placeholder={t('admin:paymentOrders.filterOrderHint')}
              onChange={(e) => {
                setOrderQuery(e.target.value)
                setPageCurrent(1)
              }}
            />
          </AdminField>
        </AdminDataToolbar>

        {initialLoading ? (
          <Skeleton className="m-3 h-48 rounded-lg" />
        ) : (
          <ResponsiveTable
            columns={columns}
            rows={list}
            loading={loading}
            loadingRowCount={8}
            loadingCardCount={4}
            getRowKey={(row) => row.id}
            wrapDesktopInCard={false}
            tableClassName="min-w-[880px] text-sm"
            tableHeaderClassName="bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
            tableBodyClassName="divide-y divide-border"
            renderDesktopContainer={(content) => content}
            renderDesktopEmpty={
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('admin:paymentOrders.empty')}</p>
            }
            renderMobileCard={(row) => (
              <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-medium">#{row.id}</p>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase',
                      STATUS_CLASS[row.status] ?? 'bg-muted text-foreground',
                    )}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{row.idrOrderId}</p>
                <p className="mt-1 text-sm">
                  {row.planName}{' '}
                  <span className="font-mono text-xs text-muted-foreground">{row.planCode}</span>
                </p>
                <p className="mt-0.5 text-sm tabular-nums">{formatOrderAmount(row.amountCents, row.currency)}</p>
                <AdminButtonGhost className="mt-2" onClick={() => void openDetail(row)}>
                  {t('admin:paymentOrders.viewDetail')}
                </AdminButtonGhost>
              </article>
            )}
          />
        )}
      </AdminDataPanel>

      {!initialLoading ? (
        <ProPagination
          page={pageCurrent}
          pageSize={PAGE_SIZE}
          total={totalCount}
          disabled={loading}
          onPageChange={setPageCurrent}
        />
      ) : null}

      <PaymentOrderDetailModal
        order={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onUpdated={(updated) => {
          setDetail(updated)
          void load(pageCurrent)
        }}
      />
    </AdminDataPage>
  )
}
