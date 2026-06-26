import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import {
  fetchUsageCurrent,
  fetchUsageEvents,
  type UsageCurrent,
  type UsageEventItem,
} from '@/api/billingApi'

export interface UseBillingResult {
  usage: UsageCurrent | null
  events: UsageEventItem[]
  loading: boolean
  runFilter: string
  setRunFilter: (next: string) => void
  tokenPercent: number
  payReturnChecking: boolean
}

/** 账单：当前用量 + 用量明细（可按 runId 筛选，URL searchParams 驱动）。逻辑迁自原 BillingPage。 */
export function useBilling(): UseBillingResult {
  const { t } = useTranslation(['dashboard'])
  const navigate = useNavigate()
  useMarkRouteSeen()
  const [searchParams, setSearchParams] = useSearchParams()
  const runFilter = searchParams.get('runId')?.trim() || ''
  const payOrder = searchParams.get('payOrder')?.trim() || ''
  const [usage, setUsage] = useState<UsageCurrent | null>(null)
  const [events, setEvents] = useState<UsageEventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!payOrder) return
    navigate(`/checkout?order=${encodeURIComponent(payOrder)}&return=1`, { replace: true })
  }, [payOrder, navigate])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchUsageCurrent(),
      fetchUsageEvents({ pageSize: runFilter ? 50 : 10, runId: runFilter || undefined }),
    ])
      .then(([current, page]) => {
        if (cancelled) return
        setUsage(current)
        setEvents(page.list)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        appToast.error(err instanceof Error ? err.message : t('dashboard:billing.loadFail'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFilter, t])

  const tokenPercent =
    usage?.tokenQuota && usage.tokenQuota > 0
      ? Math.min(100, (usage.tokensUsed / usage.tokenQuota) * 100)
      : 0

  const setRunFilter = (next: string) => {
    const trimmed = next.trim()
    if (trimmed) {
      setSearchParams({ runId: trimmed })
    } else {
      setSearchParams({})
    }
  }

  return {
    usage,
    events,
    loading,
    runFilter,
    setRunFilter,
    tokenPercent,
    payReturnChecking: Boolean(payOrder),
  }
}
