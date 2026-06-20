import { secureFetch } from '../security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '../utils/resultApi'

export interface PlanPublic {
  code: string
  name: string
  description: string | null
  priceCents: number | null
  currency: string
  priceLabel: string
  periodLabel: string | null
  monthlyTokenQuota: number | null
  monthlyRunQuota: number | null
  features: string[]
  highlight: boolean
  cta: string
}

export interface UsageCurrent {
  periodYyyyMm: string
  tokensUsed: number
  tokenQuota: number | null
  runsUsed: number
  runQuota: number | null
  costMicros: number
  percentUsed: number
  quotaWarning: boolean
  planCode: string
  planName: string
  periodEnd: string
}

export interface UsageTrendPoint {
  date: string
  tokens: number
  costMicros: number
}

export interface UsageEventItem {
  id: number
  runId: string | null
  sessionId: string | null
  traceId: string | null
  eventType: string
  model: string | null
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCostMicros: number
  createdAt: string
}

export interface UsageEventsPage {
  list: UsageEventItem[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface SubscriptionInfo {
  planCode: string
  planName: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
}

export async function fetchPlans(): Promise<PlanPublic[]> {
  const res = await secureFetch('/api/billing/auth/plans')
  if (!res.ok) {
    throw new Error('加载套餐失败')
  }
  const data = await parseResultResponse<PlanPublic[]>(res)
  return Array.isArray(data) ? data : []
}

export async function fetchUsageCurrent(): Promise<UsageCurrent> {
  const res = await secureFetch('/api/billing/auth/usage/current')
  if (!res.ok) {
    throw new Error('加载用量失败')
  }
  return parseResultResponse<UsageCurrent>(res)
}

export async function fetchUsageTrends(days = 30): Promise<UsageTrendPoint[]> {
  const res = await secureFetch(`/api/billing/auth/usage/trends?days=${days}`)
  if (!res.ok) {
    return []
  }
  const data = await parseResultResponse<{ points: UsageTrendPoint[] }>(res)
  return Array.isArray(data?.points) ? data.points : []
}

export async function fetchUsageEvents(params: {
  pageCurrent?: number
  pageSize?: number
  runId?: string
}): Promise<UsageEventsPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params.pageCurrent ?? 1),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.runId?.trim()) {
    search.set('runId', params.runId.trim())
  }
  const res = await secureFetch(`/api/billing/auth/usage/events?${search.toString()}`)
  if (!res.ok) {
    throw new Error('加载用量明细失败')
  }
  const data = await parseResultResponse<UsageEventsPage>(res)
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    totalCount: data?.totalCount ?? 0,
    pageCurrent: data?.pageCurrent ?? 1,
    pageSize: data?.pageSize ?? 20,
  }
}

export async function fetchSubscription(): Promise<SubscriptionInfo | null> {
  const res = await secureFetch('/api/billing/auth/subscription')
  if (!res.ok) {
    return null
  }
  return parseResultResponse<SubscriptionInfo>(res)
}

export async function fetchEnabledFeatures(): Promise<string[]> {
  const res = await secureFetch('/api/billing/auth/features')
  if (!res.ok) {
    return []
  }
  const data = await parseResultResponse<string[]>(res)
  return Array.isArray(data) ? data : []
}

export interface SiteContent {
  contentKey: string
  title: string
  bodyMd: string
  locale: string
  updatedAt: string
}

export interface SiteDanmaku {
  id: number
  message: string
  authorName: string
  region: string | null
  userId: number | null
  createdAt: string
}

export interface PublicSiteSettings {
  registrationEnabled: boolean
  registrationRequireEmailVerify: boolean
}

export async function fetchPublicSiteSettings(): Promise<PublicSiteSettings> {
  const res = await secureFetch('/api/billing/auth/settings/public')
  if (!res.ok) {
    return { registrationEnabled: true, registrationRequireEmailVerify: true }
  }
  return parseResultResponse<PublicSiteSettings>(res)
}

export async function fetchSiteContent(key: string): Promise<SiteContent | null> {
  const res = await secureFetch(`/api/billing/auth/site-content/${encodeURIComponent(key)}`)
  if (!res.ok) {
    return null
  }
  return parseResultResponse<SiteContent>(res)
}

export interface SiteDanmakuPage {
  list: SiteDanmaku[]
  hasMore: boolean
  nextBeforeId: number | null
}

export async function fetchDanmakuPage(params?: {
  pageSize?: number
  beforeId?: number | null
}): Promise<SiteDanmakuPage> {
  const search = new URLSearchParams({
    pageSize: String(params?.pageSize ?? 30),
  })
  if (params?.beforeId != null && params.beforeId > 0) {
    search.set('beforeId', String(params.beforeId))
  }
  const res = await secureFetch(`/api/billing/auth/danmaku?${search.toString()}`)
  if (!res.ok) {
    throw new Error('加载弹幕失败')
  }
  const data = await parseResultResponse<SiteDanmakuPage>(res)
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    hasMore: Boolean(data?.hasMore),
    nextBeforeId: data?.nextBeforeId ?? null,
  }
}

/** @deprecated 使用 fetchDanmakuPage */
export async function fetchDanmakuList(): Promise<SiteDanmaku[]> {
  const page = await fetchDanmakuPage({ pageSize: 120 })
  return page.list
}

export async function postDanmaku(message: string): Promise<SiteDanmaku> {
  const res = await secureFetch('/api/billing/auth/danmaku', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message.trim() }),
  })
  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }
  return parseResultResponse<SiteDanmaku>(res)
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  }
  if (n >= 10_000) {
    return `${(n / 1000).toFixed(0)}k`
  }
  return n.toLocaleString('zh-CN')
}

export function formatCostMicros(micros: number): string {
  const yuan = micros / 1_000_000
  if (yuan < 0.01) {
    return '¥0.00'
  }
  return `¥${yuan.toFixed(2)}`
}
