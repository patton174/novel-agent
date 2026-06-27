import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import {
  fetchUsageCurrent,
  fetchUsageEvents,
  fetchUsageModelTrends,
  type UsageCurrent,
  type UsageEventItem,
  type UsageModelTrends,
} from '@/api/billingApi'

export interface UseUsageDetailsResult {
  usage: UsageCurrent | null
  events: UsageEventItem[]
  modelTrends: UsageModelTrends | null
  loading: boolean
  runFilter: string
  setRunFilter: (next: string) => void
  tokenPercent: number
  trendDays: number
  setTrendDays: (days: number) => void
}

/** 用量明细：配额摘要 + 多模型趋势 + 调用记录。 */
export function useUsageDetails(): UseUsageDetailsResult {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [searchParams, setSearchParams] = useSearchParams()
  const runFilter = searchParams.get('runId')?.trim() || ''
  const [usage, setUsage] = useState<UsageCurrent | null>(null)
  const [events, setEvents] = useState<UsageEventItem[]>([])
  const [modelTrends, setModelTrends] = useState<UsageModelTrends | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendDays, setTrendDays] = useState(30)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      fetchUsageCurrent(),
      fetchUsageEvents({ pageSize: runFilter ? 50 : 20, runId: runFilter || undefined }),
      fetchUsageModelTrends(trendDays),
    ])
      .then(([current, page, trends]) => {
        if (cancelled) return
        setUsage(current)
        setEvents(page.list)
        setModelTrends(trends)
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
  }, [runFilter, trendDays, t])

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
    modelTrends,
    loading,
    runFilter,
    setRunFilter,
    tokenPercent,
    trendDays,
    setTrendDays,
  }
}
