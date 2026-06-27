import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { fetchUsageCurrent, fetchUsageTrends, type UsageCurrent, type UsageTrendPoint } from '@/api/billingApi'

export interface UseBillingBillsResult {
  usage: UsageCurrent | null
  costTrends: UsageTrendPoint[]
  loading: boolean
  payReturnChecking: boolean
}

/** 我的账单：当前周期用量摘要（费用）+ 支付回跳。 */
export function useBillingBills(): UseBillingBillsResult {
  const { t } = useTranslation(['dashboard'])
  const navigate = useNavigate()
  useMarkRouteSeen()
  const [searchParams] = useSearchParams()
  const payOrder = searchParams.get('payOrder')?.trim() || ''
  const [usage, setUsage] = useState<UsageCurrent | null>(null)
  const [costTrends, setCostTrends] = useState<UsageTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!payOrder) return
    navigate(`/checkout?order=${encodeURIComponent(payOrder)}&return=1`, { replace: true })
  }, [payOrder, navigate])

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchUsageCurrent(), fetchUsageTrends(30)])
      .then(([current, trends]) => {
        if (cancelled) return
        setUsage(current)
        setCostTrends(trends)
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
  }, [t])

  return {
    usage,
    costTrends,
    loading,
    payReturnChecking: Boolean(payOrder),
  }
}
