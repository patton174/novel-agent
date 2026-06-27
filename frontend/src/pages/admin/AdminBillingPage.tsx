import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import {
  approveUpgradeRequest,
  adjustAdminBalance,
  deleteRedemptionCode,
  fetchAdminPlans,
  fetchOverage,
  fetchRedemptionCodes,
  fetchUpgradeRequests,
  formatCostMicros,
  generateRedemptionCodes,
  getAdminBalance,
  rejectUpgradeRequest,
  type AdminPlan,
} from '@/api/billingAdminApi'
import type { RedemptionCode, UpgradeRequest, UsageOverageRow } from '@/types/billing'
import { fromDatetimeLocalValue } from '@/api/inviteAdminApi'
import {
  AdminButton,
  AdminButtonOutline,
  AdminControlRow,
  AdminDateTimeInput,
  AdminField,
  AdminSelect,
  AdminStatusBadge,
  AdminTextInput,
  adminFormGridClass,
  adminFormGridWideClass,
} from '@/components/admin/AdminFormControls'
import {
  PixelCellMono,
  PixelCellStack,
  PixelCellText,
  PixelTable,
  PixelTableActionBar,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { copyToClipboard } from '@/utils/copyToClipboard'
import i18n from '@/i18n'

type BillingSection = 'cdk' | 'approve' | 'balance' | 'overage'

const BILLING_SECTIONS: BillingSection[] = ['cdk', 'approve', 'balance', 'overage']

export default function AdminBillingPage() {
  const { section: sectionParam } = useParams<{ section: string }>()
  const section = BILLING_SECTIONS.includes(sectionParam as BillingSection)
    ? (sectionParam as BillingSection)
    : null

  if (!section) {
    return <Navigate to="/admin/billing/cdk" replace />
  }

  return <AdminBillingSectionPage section={section} />
}

function AdminBillingSectionPage({ section }: { section: BillingSection }) {
  useMarkRouteSeen()
  const [plans, setPlans] = useState<AdminPlan[]>([])

  useEffect(() => {
    void fetchAdminPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
  }, [])

  return (
    <AdminDataPage>
      {section === 'cdk' ? <CdkTab plans={plans} /> : null}
      {section === 'approve' ? <ApproveTab /> : null}
      {section === 'balance' ? <BalanceTab /> : null}
      {section === 'overage' ? <OverageTab /> : null}
    </AdminDataPage>
  )
}

const CDK_TYPES = ['balance', 'plan', 'quota_bonus'] as const

function currentPeriodYyyyMm(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatInstant(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale)
}

function CdkTab({ plans }: { plans: AdminPlan[] }) {
  const { t, i18n: i18nInstance } = useTranslation(['admin'])
  const dateLocale = i18nInstance.language === 'zh' ? 'zh-CN' : 'en-US'
  const [type, setType] = useState<string>('balance')
  const [value, setValue] = useState('5000000')
  const [count, setCount] = useState(5)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState('')
  const [codes, setCodes] = useState<RedemptionCode[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<Array<{ id: string; code: string }>>([])

  const loadCodes = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchRedemptionCodes(1, 50)
      setCodes(page.list)
    } catch (err) {
      setCodes([])
      appToast.error(err instanceof Error ? err.message : t('admin:billing.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCodes()
  }, [loadCodes])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const expiresIso = expiresAt.trim() ? fromDatetimeLocalValue(expiresAt) : undefined
      const payload = {
        type,
        value: value.trim(),
        count: Math.max(1, count),
        maxUses: Math.max(1, maxUses),
        expiresAt: expiresIso ?? undefined,
      }
      const out = await generateRedemptionCodes(payload)
      setGenerated(out)
      appToast.success(t('admin:billing.generateSuccess', { count: out.length }))
      await loadCodes()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:billing.generateFail'))
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (row: RedemptionCode) => {
    const ok = await confirmAction({
      title: t('admin:billing.deleteConfirmTitle'),
      description: row.code,
    })
    if (!ok) return
    try {
      await deleteRedemptionCode(row.id)
      appToast.success(t('admin:billing.deleteSuccess'))
      await loadCodes()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:billing.deleteFail'))
    }
  }

  const columns: PixelColumn<RedemptionCode>[] = [
    {
      key: 'code',
      header: t('admin:billing.colCode'),
      render: (row) => <PixelCellMono>{row.code}</PixelCellMono>,
    },
    {
      key: 'type',
      header: t('admin:billing.colType'),
      render: (row) => <PixelCellText>{row.type}</PixelCellText>,
    },
    {
      key: 'value',
      header: t('admin:billing.colValue'),
      render: (row) => <PixelCellMono className="max-w-[200px] truncate">{row.value}</PixelCellMono>,
    },
    {
      key: 'uses',
      header: t('admin:billing.colUses'),
      render: (row) => (
        <PixelCellText>
          {row.usedCount}/{row.maxUses}
        </PixelCellText>
      ),
    },
    {
      key: 'expires',
      header: t('admin:billing.colExpires'),
      render: (row) => <PixelCellText>{formatInstant(row.expiresAt, dateLocale)}</PixelCellText>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <PixelTableActionBar>
          <PixelTableActionButton onClick={() => void copyToClipboard(row.code)}>
            {t('admin:billing.copy')}
          </PixelTableActionButton>
          <PixelTableActionButton onClick={() => void handleDelete(row)}>
            {t('admin:billing.void')}
          </PixelTableActionButton>
        </PixelTableActionBar>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminDataPanel>
        <AdminDataPanelHeader title={t('admin:billing.generateTitle')} />
        <AdminDataPanelBody className="space-y-4">
          <div className={adminFormGridClass}>
            <AdminField label={t('admin:billing.cdkType')} layout="form">
              <AdminSelect
                value={type}
                onChange={(e) => {
                  const next = e.target.value
                  setType(next)
                  if (next === 'plan') {
                    setValue(plans[0]?.code ?? 'pro')
                  } else if (next === 'quota_bonus') {
                    setValue('{"tokenBonus":10000,"runBonus":5}')
                  } else {
                    setValue('5000000')
                  }
                }}
              >
                {CDK_TYPES.map((tk) => (
                  <option key={tk} value={tk}>{t(`admin:billing.cdkTypes.${tk}`)}</option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label={t('admin:billing.cdkValue')} layout="form">
              {type === 'plan' ? (
                <AdminSelect value={value} onChange={(e) => setValue(e.target.value)}>
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </AdminSelect>
              ) : (
                <AdminTextInput value={value} onChange={(e) => setValue(e.target.value)} />
              )}
            </AdminField>
            <AdminField label={t('admin:billing.cdkCount')} layout="form">
              <AdminTextInput
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </AdminField>
            <AdminField label={t('admin:billing.cdkMaxUses')} layout="form">
              <AdminTextInput
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
              />
            </AdminField>
          </div>
          <div className={adminFormGridWideClass}>
            <AdminField label={t('admin:billing.cdkExpires')} layout="form">
              <AdminDateTimeInput value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </AdminField>
          </div>
          <AdminButton disabled={generating} onClick={() => void handleGenerate()}>
            {t('admin:billing.generate')}
          </AdminButton>
          {generated.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
              {generated.map((g) => (
                <div key={g.id}>{g.code}</div>
              ))}
            </div>
          ) : null}
        </AdminDataPanelBody>
      </AdminDataPanel>

      <AdminDataPanel>
        <AdminDataPanelHeader title={t('admin:billing.cdkListTitle')} />
        {loading ? (
          <AdminDataPanelBody>
            <Skeleton className="h-48 w-full" />
          </AdminDataPanelBody>
        ) : (
          <AdminDataPanelBody flush>
            <PixelTable
              embedded
              compact
              columns={columns}
              data={codes ?? []}
              rowKey="id"
              emptyText={t('admin:billing.emptyCdk')}
            />
          </AdminDataPanelBody>
        )}
      </AdminDataPanel>
    </div>
  )
}

function ApproveTab() {
  const { t, i18n: i18nInstance } = useTranslation(['admin'])
  const dateLocale = i18nInstance.language === 'zh' ? 'zh-CN' : 'en-US'
  const [statusFilter, setStatusFilter] = useState('pending')
  const [requests, setRequests] = useState<UpgradeRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewNote, setReviewNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchUpgradeRequests(statusFilter || undefined, 1, 50)
      setRequests(page.list)
    } catch (err) {
      setRequests([])
      appToast.error(err instanceof Error ? err.message : t('admin:billing.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleApprove = async (row: UpgradeRequest) => {
    try {
      await approveUpgradeRequest(row.id, reviewNote.trim() || undefined)
      appToast.success(t('admin:billing.approveSuccess'))
      setReviewNote('')
      await load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:billing.approveFail'))
    }
  }

  const handleReject = async (row: UpgradeRequest) => {
    try {
      await rejectUpgradeRequest(row.id, reviewNote.trim() || undefined)
      appToast.success(t('admin:billing.rejectSuccess'))
      setReviewNote('')
      await load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:billing.rejectFail'))
    }
  }

  const columns: PixelColumn<UpgradeRequest>[] = [
    {
      key: 'user',
      header: t('admin:billing.colUser'),
      render: (row) => <PixelCellMono>{row.userId}</PixelCellMono>,
    },
    {
      key: 'type',
      header: t('admin:billing.colType'),
      render: (row) => (
        <PixelCellStack title={row.requestType} subtitle={row.targetValue} />
      ),
    },
    {
      key: 'reason',
      header: t('admin:billing.colReason'),
      render: (row) => <PixelCellText>{row.reason ?? '—'}</PixelCellText>,
    },
    {
      key: 'status',
      header: t('admin:billing.colStatus'),
      render: (row) => (
        <AdminStatusBadge
          tone={
            row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'warning' : 'warning'
          }
        >
          {t(`admin:billing.requestStatus.${row.status}`, row.status)}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'time',
      header: t('admin:billing.colTime'),
      render: (row) => <PixelCellText>{formatInstant(row.createdAt, dateLocale)}</PixelCellText>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'pending' ? (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => void handleApprove(row)}>
              {t('admin:billing.approve')}
            </PixelTableActionButton>
            <PixelTableActionButton onClick={() => void handleReject(row)}>
              {t('admin:billing.reject')}
            </PixelTableActionButton>
          </PixelTableActionBar>
        ) : (
          <PixelCellText>{row.reviewNote ?? '—'}</PixelCellText>
        ),
    },
  ]

  return (
    <AdminDataPanel>
      <AdminDataPanelHeader title={t('admin:billing.approveTitle')} />
      <AdminDataPanelBody className="space-y-4">
        <AdminControlRow className="items-end">
          <AdminField label={t('admin:billing.statusFilter')} layout="form" className="min-w-[160px] sm:max-w-[200px]">
            <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t('admin:billing.allStatus')}</option>
              <option value="pending">{t('admin:billing.requestStatus.pending')}</option>
              <option value="approved">{t('admin:billing.requestStatus.approved')}</option>
              <option value="rejected">{t('admin:billing.requestStatus.rejected')}</option>
            </AdminSelect>
          </AdminField>
          <AdminField label={t('admin:billing.reviewNote')} layout="form" className="min-w-[200px] flex-1">
            <AdminTextInput value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
          </AdminField>
        </AdminControlRow>
      </AdminDataPanelBody>
      {loading ? (
        <AdminDataPanelBody>
          <Skeleton className="h-48 w-full" />
        </AdminDataPanelBody>
      ) : (
        <AdminDataPanelBody flush>
          <PixelTable
            embedded
            compact
            columns={columns}
            data={requests ?? []}
            rowKey="id"
            emptyText={t('admin:billing.emptyRequests')}
          />
        </AdminDataPanelBody>
      )}
    </AdminDataPanel>
  )
}

function BalanceTab() {
  const { t } = useTranslation(['admin'])
  const [userId, setUserId] = useState('')
  const [balanceMicros, setBalanceMicros] = useState<number | null>(null)
  const [deltaYuan, setDeltaYuan] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  const handleQuery = async () => {
    const id = Number(userId.trim())
    if (!id || id <= 0) {
      appToast.info(t('admin:billing.userIdRequired'))
      return
    }
    setLoading(true)
    try {
      const bal = await getAdminBalance(id)
      setBalanceMicros(bal.balanceMicros)
    } catch (err) {
      setBalanceMicros(null)
      appToast.error(err instanceof Error ? err.message : t('admin:billing.balanceLoadFail'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async () => {
    const id = Number(userId.trim())
    const yuan = Number(deltaYuan.trim())
    if (!id || id <= 0) {
      appToast.info(t('admin:billing.userIdRequired'))
      return
    }
    if (!Number.isFinite(yuan) || yuan === 0) {
      appToast.info(t('admin:billing.deltaRequired'))
      return
    }
    setAdjusting(true)
    try {
      const deltaMicros = Math.round(yuan * 1_000_000)
      await adjustAdminBalance(id, deltaMicros, reason.trim() || undefined)
      appToast.success(t('admin:billing.adjustSuccess'))
      setDeltaYuan('')
      const bal = await getAdminBalance(id)
      setBalanceMicros(bal.balanceMicros)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:billing.adjustFail'))
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <AdminDataPanel>
      <AdminDataPanelHeader title={t('admin:billing.balanceTitle')} />
      <AdminDataPanelBody className="space-y-4">
        <AdminControlRow className="items-end">
          <AdminField label={t('admin:billing.userId')} layout="form" className="min-w-[160px] sm:max-w-[200px]">
            <AdminTextInput value={userId} onChange={(e) => setUserId(e.target.value)} />
          </AdminField>
          <AdminButton disabled={loading} onClick={() => void handleQuery()}>
            {t('admin:billing.queryBalance')}
          </AdminButton>
        </AdminControlRow>
        {balanceMicros != null ? (
          <p className="text-lg font-semibold tabular-nums">{formatCostMicros(balanceMicros)}</p>
        ) : null}
        <div className={adminFormGridWideClass}>
          <AdminField label={t('admin:billing.deltaYuan')} layout="form">
            <AdminTextInput
              value={deltaYuan}
              onChange={(e) => setDeltaYuan(e.target.value)}
              placeholder="1.00"
            />
          </AdminField>
          <AdminField label={t('admin:billing.adjustReason')} layout="form">
            <AdminTextInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </AdminField>
        </div>
        <AdminButtonOutline disabled={adjusting} onClick={() => void handleAdjust()}>
          {t('admin:billing.adjustBalance')}
        </AdminButtonOutline>
      </AdminDataPanelBody>
    </AdminDataPanel>
  )
}

function OverageTab() {
  const { t } = useTranslation(['admin'])
  const [period, setPeriod] = useState(currentPeriodYyyyMm())
  const [rows, setRows] = useState<UsageOverageRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!period.trim()) return
    setLoading(true)
    try {
      setRows(await fetchOverage(period.trim()))
    } catch (err) {
      setRows([])
      appToast.error(err instanceof Error ? err.message : t('admin:billing.overageLoadFail'))
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    void load()
  }, [load])

  const columns: PixelColumn<UsageOverageRow>[] = [
    {
      key: 'user',
      header: t('admin:billing.colUser'),
      render: (row) => <PixelCellMono>{row.userId}</PixelCellMono>,
    },
    {
      key: 'tokens',
      header: t('admin:billing.colTokens'),
      render: (row) => <PixelCellText>{row.tokensUsed.toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}</PixelCellText>,
    },
    {
      key: 'cost',
      header: t('admin:billing.colCost'),
      render: (row) => <PixelCellText>{formatCostMicros(row.costMicros)}</PixelCellText>,
    },
    {
      key: 'overage',
      header: t('admin:billing.colOverage'),
      render: (row) => (
        <PixelCellText className="text-rose-600">{formatCostMicros(row.overageMicros)}</PixelCellText>
      ),
    },
  ]

  return (
    <AdminDataPanel>
      <AdminDataPanelHeader title={t('admin:billing.overageTitle')} />
      <AdminDataPanelBody className="space-y-4">
        <AdminControlRow className="items-end">
          <AdminField label={t('admin:billing.period')} layout="form" className="min-w-[160px] sm:max-w-[200px]">
            <AdminTextInput value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" />
          </AdminField>
          <AdminButton disabled={loading} onClick={() => void load()}>
            {t('admin:billing.loadOverage')}
          </AdminButton>
        </AdminControlRow>
      </AdminDataPanelBody>
      {loading ? (
        <AdminDataPanelBody>
          <Skeleton className="h-48 w-full" />
        </AdminDataPanelBody>
      ) : (
        <AdminDataPanelBody flush>
          <PixelTable
            embedded
            compact
            columns={columns}
            data={rows ?? []}
            rowKey={(row) => `${row.userId}-${row.periodYyyyMm}`}
            emptyText={t('admin:billing.emptyOverage')}
          />
        </AdminDataPanelBody>
      )}
    </AdminDataPanel>
  )
}
