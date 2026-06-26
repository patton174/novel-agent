import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchAdminPaymentOrderDetail,
  fetchAdminPaymentOrders,
  formatOrderAmount,
  type AdminPaymentOrder,
  type AdminPaymentOrderDetail,
} from '@/api/billingAdminApi'
import { PaymentOrderDetailModal } from '@/components/admin/PaymentOrderDetailModal'
import { AdminResponsivePixelTable } from '@/components/admin/AdminResponsivePixelTable'
import {
  AdminField,
  AdminSelect,
  AdminTextInput,
  AdminButtonGhost,
  AdminStatusBadge,
} from '@/components/admin/AdminFormControls'
import {
  PixelBadge,
  PixelCellMono,
  PixelCellStack,
  PIXEL_MOBILE_CARD,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelHeader,
  AdminDataToolbar,
} from '@/components/layout/AdminDataLayout'
import { ProPagination } from '@/components/pro/ProPagination'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 20

function orderStatusTone(status: string): 'success' | 'warning' | 'muted' | 'default' {
  if (status === 'DONE') return 'success'
  if (status === 'NEW') return 'default'
  if (status === 'REFUND') return 'warning'
  return 'muted'
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

  const openDetail = useCallback(
    async (order: AdminPaymentOrder, syncRemote = false) => {
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
    },
    [t],
  )

  const list = orders ?? []
  const initialLoading = loading && orders === null

  const columns = useMemo((): PixelColumn<AdminPaymentOrder>[] => {
    return [
      {
        key: 'id',
        header: 'ID',
        className: 'tabular-nums',
        render: (row) => <PixelCellMono>{row.id}</PixelCellMono>,
      },
      {
        key: 'idrOrderId',
        header: t('admin:paymentOrders.colIdrOrder'),
        render: (row) => (
          <PixelCellMono className="max-w-[140px] truncate">
            <span title={row.idrOrderId}>{row.idrOrderId.slice(0, 12)}…</span>
          </PixelCellMono>
        ),
      },
      {
        key: 'userId',
        header: t('admin:paymentOrders.userId'),
        className: 'tabular-nums',
        render: (row) => row.userId,
      },
      {
        key: 'plan',
        header: t('admin:paymentOrders.colPlan'),
        render: (row) => <PixelCellStack title={row.planName} subtitle={row.planCode} />,
      },
      {
        key: 'amount',
        header: t('admin:paymentOrders.colAmount'),
        render: (row) => (
          <PixelCellMono>{formatOrderAmount(row.amountCents, row.currency)}</PixelCellMono>
        ),
      },
      {
        key: 'status',
        header: t('admin:paymentOrders.colStatus'),
        render: (row) => (
          <AdminStatusBadge
            tone={
              row.status === 'DONE'
                ? 'success'
                : row.status === 'NEW'
                  ? 'info'
                  : row.status === 'REFUND'
                    ? 'warning'
                    : 'neutral'
            }
          >
            {row.status}
          </AdminStatusBadge>
        ),
      },
      {
        key: 'createdAt',
        header: t('admin:paymentOrders.colCreated'),
        render: (row) => (
          <PixelCellMono className="whitespace-nowrap text-muted-foreground">
            {new Date(row.createdAt).toLocaleString('zh-CN')}
          </PixelCellMono>
        ),
      },
      {
        key: 'paidAt',
        header: t('admin:paymentOrders.colPaidAt'),
        render: (row) => (
          <PixelCellMono className="whitespace-nowrap text-muted-foreground">
            {row.paidAt ? new Date(row.paidAt).toLocaleString('zh-CN') : '—'}
          </PixelCellMono>
        ),
      },
      {
        key: 'actions',
        header: t('admin:paymentOrders.colActions'),
        align: 'right',
        render: (row) => (
          <PixelTableActionButton onClick={() => void openDetail(row)}>
            {t('admin:paymentOrders.viewDetail')}
          </PixelTableActionButton>
        ),
      },
    ]
  }, [openDetail, t])

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:paymentOrders.title')}
          description={t('admin:paymentOrders.desc')}
        />
        {planIdFilter ? (
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground/15 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{t('admin:paymentOrders.filteredByPlan')}</span>
            <PixelBadge tone="neon">#{planIdFilter}</PixelBadge>
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

        <AdminResponsivePixelTable
          columns={columns}
          data={list}
          rowKey="id"
          loading={loading && !initialLoading}
          initialLoading={initialLoading}
          emptyText={t('admin:paymentOrders.empty')}
          skeletonRows={8}
          renderMobileCard={(row) => (
            <article className={cn(PIXEL_MOBILE_CARD, 'p-4')}>
              <div className="flex items-start justify-between gap-2">
                <PixelCellMono>#{row.id}</PixelCellMono>
                <PixelBadge tone={orderStatusTone(row.status)}>{row.status}</PixelBadge>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{row.idrOrderId}</p>
              <PixelCellStack title={row.planName} subtitle={row.planCode} className="mt-1" />
              <PixelCellMono className="mt-0.5">
                {formatOrderAmount(row.amountCents, row.currency)}
              </PixelCellMono>
              <PixelTableActionButton className="mt-2" onClick={() => void openDetail(row)}>
                {t('admin:paymentOrders.viewDetail')}
              </PixelTableActionButton>
            </article>
          )}
        />
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
