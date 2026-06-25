import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface AdminPlan {
  id: number
  code: string
  name: string
  description: string | null
  priceCents: number | null
  currency: string
  monthlyTokenQuota: number | null
  monthlyRunQuota: number | null
  rateLimitRpm: number
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  features: string[]
  idrProjectId: string | null
  idrSkuId: string | null
  paymentReady: boolean
  orderStats: PlanOrderStats
}

export interface PlanOrderStats {
  total: number
  pending: number
  paid: number
  expired: number
  refunded: number
}

export interface AdminPlanDetail {
  plan: AdminPlan
  paymentReady: boolean
  orderStats: PlanOrderStats
  recentOrders: AdminPaymentOrder[]
}

export interface AdminPlanUpsertPayload {
  code: string
  name: string
  description?: string | null
  priceCents?: number | null
  currency?: string
  monthlyTokenQuota?: number | null
  monthlyRunQuota?: number | null
  rateLimitRpm?: number
  isFeatured?: boolean
  sortOrder?: number
  features?: string[]
  idrProjectId?: string | null
  idrSkuId?: string | null
}

export const PLAN_FEATURE_OPTIONS = [
  { key: 'basic_editor', label: '基础编辑器' },
  { key: 'txt_export', label: 'TXT 导出' },
  { key: 'pdf_export', label: 'PDF/EPUB 导出' },
  { key: 'custom_model', label: '自定义模型' },
  { key: 'priority_support', label: '优先支持' },
  { key: 'team_collaboration', label: '团队协作' },
  { key: 'custom_integrations', label: '定制集成' },
] as const

export interface AdminUserUsage {
  userId: string
  periodYyyyMm: string
  planCode: string
  planName: string
  tokensUsed: number
  tokenQuota: number | null
  runsUsed: number
  runQuota: number | null
  costMicros: number
  percentUsed: number
  recentEvents: AdminUsageEvent[]
  activeOverrides: AdminQuotaOverride[]
}

export interface AdminUsageEvent {
  id: number
  runId: string | null
  sessionId: string | null
  eventType: string
  model: string | null
  totalTokens: number
  totalCostMicros: number
  createdAt: string
}

export interface AdminQuotaOverride {
  id: number
  tokenBonus: number
  runBonus: number
  reason: string | null
  expiresAt: string | null
}

export interface PlatformUsageOverview {
  mrrCents: number
  activeSubscriptions: Record<string, number>
  monthTokensTotal: number
  monthCostMicros: number
  monthRevenueMicros: number
  modelBreakdown: { model: string; tokens: number; costMicros: number }[]
}

export interface PlatformUsageTrendPoint {
  date: string
  tokens: number
  costMicros: number
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  const res = await secureFetch('/api/billing/crm/plans')
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载套餐失败')
  }
  const data = await parseResponse<AdminPlan[]>(res)
  return Array.isArray(data) ? data.map(normalizeAdminPlan) : []
}

export async function fetchAdminPlanDetail(id: number, recentLimit = 5): Promise<AdminPlanDetail> {
  const res = await secureFetch(`/api/billing/crm/plans/${id}?recentLimit=${recentLimit}`)
  if (!res.ok) {
    throw new Error('加载套餐详情失败')
  }
  const data = await parseResponse<AdminPlanDetail>(res)
  return {
    ...data,
    plan: normalizeAdminPlan(data.plan),
    recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
  }
}

export async function fetchAdminPlanOrders(
  planId: number,
  params?: { pageCurrent?: number; pageSize?: number },
): Promise<AdminPaymentOrderPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params?.pageCurrent ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  })
  const res = await secureFetch(`/api/billing/crm/plans/${planId}/orders?${search.toString()}`)
  if (!res.ok) {
    throw new Error('加载套餐订单失败')
  }
  const data = await parseResponse<AdminPaymentOrderPage>(res)
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    totalCount: data?.totalCount ?? 0,
    pageCurrent: data?.pageCurrent ?? 1,
    pageSize: data?.pageSize ?? 20,
  }
}

function normalizeAdminPlan(plan: AdminPlan): AdminPlan {
  return {
    ...plan,
    orderStats: plan.orderStats ?? { total: 0, pending: 0, paid: 0, expired: 0, refunded: 0 },
    paymentReady: Boolean(plan.paymentReady),
  }
}

export async function createAdminPlan(payload: AdminPlanUpsertPayload): Promise<AdminPlan> {
  const res = await secureFetch('/api/billing/crm/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('创建套餐失败')
  }
  return parseResponse<AdminPlan>(res)
}

export async function updateAdminPlan(
  id: number,
  payload: AdminPlanUpsertPayload,
): Promise<AdminPlan> {
  const res = await secureFetch(`/api/billing/crm/plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('更新套餐失败')
  }
  return parseResponse<AdminPlan>(res)
}

export async function updateAdminPlanIdrBinding(
  id: number,
  payload: { idrProjectId?: string | null; idrSkuId?: string | null },
): Promise<AdminPlan> {
  const res = await secureFetch(`/api/billing/crm/plans/${id}/idr-binding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('绑定 iDataRiver 商品失败')
  }
  return normalizeAdminPlan(await parseResponse<AdminPlan>(res))
}

export async function deactivateAdminPlan(id: number): Promise<void> {
  const res = await secureFetch(`/api/billing/crm/plans/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('停用套餐失败')
  }
}

export async function activateAdminPlan(id: number): Promise<AdminPlan> {
  const res = await secureFetch(`/api/billing/crm/plans/${id}/activate`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('上架套餐失败')
  }
  return parseResponse<AdminPlan>(res)
}

export interface AdminPaymentOrder {
  id: number
  userId: number
  planId: number | null
  planCode: string
  planName: string
  idrSkuId: string | null
  idrProjectId: string | null
  idrOrderId: string
  status: string
  payMethod: string | null
  amountCents: number | null
  currency: string | null
  payUrl: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminPaymentOrderDetail extends AdminPaymentOrder {
  contactInfo: string
  callbackJson: Record<string, unknown> | null
  remoteStatus: string | null
  remoteSnapshot: Record<string, unknown> | null
}

export interface AdminPaymentOrderPage {
  list: AdminPaymentOrder[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export async function fetchAdminPaymentOrders(params: {
  status?: string
  userId?: number
  planId?: number
  planCode?: string
  orderQuery?: string
  pageCurrent?: number
  pageSize?: number
}): Promise<AdminPaymentOrderPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params.pageCurrent ?? 1),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.status?.trim()) search.set('status', params.status.trim())
  if (params.userId != null) search.set('userId', String(params.userId))
  if (params.planId != null) search.set('planId', String(params.planId))
  if (params.planCode?.trim()) search.set('planCode', params.planCode.trim())
  if (params.orderQuery?.trim()) search.set('orderQuery', params.orderQuery.trim())
  const res = await secureFetch(`/api/billing/crm/payment-orders?${search.toString()}`)
  if (!res.ok) {
    throw new Error('加载订单失败')
  }
  const data = await parseResponse<AdminPaymentOrderPage>(res)
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    totalCount: data?.totalCount ?? 0,
    pageCurrent: data?.pageCurrent ?? 1,
    pageSize: data?.pageSize ?? 20,
  }
}

export async function fetchAdminPaymentOrderDetail(
  id: number,
  syncRemote = false,
): Promise<AdminPaymentOrderDetail> {
  const res = await secureFetch(
    `/api/billing/crm/payment-orders/${id}?syncRemote=${syncRemote ? 'true' : 'false'}`,
  )
  if (!res.ok) {
    throw new Error('加载订单详情失败')
  }
  return parseResponse<AdminPaymentOrderDetail>(res)
}

export async function syncAdminPaymentOrder(id: number): Promise<AdminPaymentOrderDetail> {
  const res = await secureFetch(`/api/billing/crm/payment-orders/${id}/sync`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('同步订单失败')
  }
  return parseResponse<AdminPaymentOrderDetail>(res)
}

export async function fulfillAdminPaymentOrder(
  id: number,
  reason?: string,
): Promise<AdminPaymentOrderDetail> {
  const res = await secureFetch(`/api/billing/crm/payment-orders/${id}/fulfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason ?? null }),
  })
  if (!res.ok) {
    throw new Error('履约失败')
  }
  return parseResponse<AdminPaymentOrderDetail>(res)
}

export async function expireAdminPaymentOrder(
  id: number,
  reason?: string,
): Promise<AdminPaymentOrderDetail> {
  const res = await secureFetch(`/api/billing/crm/payment-orders/${id}/expire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason ?? null }),
  })
  if (!res.ok) {
    throw new Error('关闭订单失败')
  }
  return parseResponse<AdminPaymentOrderDetail>(res)
}

export function formatOrderAmount(amountCents: number | null, currency: string | null): string {
  if (amountCents == null) return '—'
  const symbol = !currency || currency === 'CNY' ? '¥' : `${currency} `
  return `${symbol}${(amountCents / 100).toFixed(amountCents % 100 === 0 ? 0 : 2)}`
}

export interface AdminPaymentSettings {
  enabled: boolean
  configured: boolean
  merchantSecretSet: boolean
  merchantSecretMasked: string
  baseUrl: string
  projectId: string
  publicBaseUrl: string
  defaultPayMethod: string
  locale: string
  webhookUrl: string
  docsUrl: string
}

export interface AdminPaymentSettingsUpdate {
  enabled?: boolean
  baseUrl?: string
  merchantSecret?: string
  projectId?: string
  publicBaseUrl?: string
  defaultPayMethod?: string
  locale?: string
}

export interface AdminPaymentSettingsTest {
  ok: boolean
  message: string
}

export async function fetchAdminPaymentSettings(): Promise<AdminPaymentSettings> {
  const res = await secureFetch('/api/billing/crm/payment-settings')
  if (!res.ok) {
    throw new Error('加载支付配置失败')
  }
  return parseResponse<AdminPaymentSettings>(res)
}

export async function updateAdminPaymentSettings(
  payload: AdminPaymentSettingsUpdate,
): Promise<AdminPaymentSettings> {
  const res = await secureFetch('/api/billing/crm/payment-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('保存支付配置失败')
  }
  return parseResponse<AdminPaymentSettings>(res)
}

export async function testAdminPaymentSettings(): Promise<AdminPaymentSettingsTest> {
  const res = await secureFetch('/api/billing/crm/payment-settings/test', { method: 'POST' })
  if (!res.ok) {
    throw new Error('测试连接失败')
  }
  return parseResponse<AdminPaymentSettingsTest>(res)
}

export async function updateUserSubscription(
  userId: string,
  planCode: string,
  reason?: string,
): Promise<void> {
  const res = await secureFetch(`/api/billing/crm/user/${userId}/subscription`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planCode, reason }),
  })
  if (!res.ok) {
    throw new Error('更新用户订阅失败')
  }
}

export async function fetchAdminUserUsage(userId: string): Promise<AdminUserUsage> {
  const res = await secureFetch(`/api/billing/crm/usage/user/${userId}`)
  if (!res.ok) {
    throw new Error('加载用户用量失败')
  }
  return parseResponse<AdminUserUsage>(res)
}

export async function addUserQuotaOverride(
  userId: string,
  payload: {
    tokenBonus: number
    runBonus: number
    expiresAt?: string | null
    reason?: string
  },
): Promise<void> {
  const res = await secureFetch(`/api/billing/crm/user/${userId}/quota-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('添加临时配额失败')
  }
}

export async function fetchPlatformUsageOverview(): Promise<PlatformUsageOverview> {
  const res = await secureFetch('/api/billing/crm/usage/overview')
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载收入概览失败')
  }
  return parseResponse<PlatformUsageOverview>(res)
}

export async function fetchPlatformUsageTrends(
  days = 30,
): Promise<PlatformUsageTrendPoint[]> {
  const res = await secureFetch(`/api/billing/crm/usage/trends?days=${days}`)
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载用量趋势失败')
  }
  const data = await parseResponse<{ points: PlatformUsageTrendPoint[] }>(res)
  return Array.isArray(data?.points) ? data.points : []
}

export function formatCostMicros(micros: number): string {
  const yuan = micros / 1_000_000
  if (yuan < 0.01) return '¥0.00'
  return `¥${yuan.toFixed(2)}`
}

export function formatPlanPrice(priceCents: number | null): string {
  if (priceCents == null) return '定制'
  if (priceCents === 0) return '免费'
  const yuan = priceCents / 100
  return yuan % 1 === 0 ? `¥${yuan.toFixed(0)}/月` : `¥${yuan.toFixed(2)}/月`
}

export function formatTokenQuota(quota: number | null): string {
  if (quota == null) return '不限'
  if (quota >= 1_000_000) return `${(quota / 1_000_000).toFixed(1)}M`
  if (quota >= 1_000) return `${Math.round(quota / 1000)}k`
  return quota.toLocaleString('zh-CN')
}

export interface SiteContentItem {
  contentKey: string
  title: string
  bodyMd: string
  locale: string
  updatedAt: string
}

export interface AuditLogItem {
  id: number
  actorId: number
  action: string
  targetType: string | null
  targetId: string | null
  beforeJson: string | null
  afterJson: string | null
  createdAt: string
}

export interface AuditLogPage {
  list: AuditLogItem[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export const SITE_CONTENT_KEYS = [
  { key: 'privacy', label: '隐私政策' },
  { key: 'terms', label: '用户协议' },
  { key: 'contact', label: '联系我们' },
  { key: 'announcement', label: '系统公告' },
] as const

export async function fetchAdminSiteContent(): Promise<SiteContentItem[]> {
  const res = await secureFetch('/api/billing/crm/site-content')
  if (!res.ok) {
    throw new Error('加载站点内容失败')
  }
  const data = await parseResponse<SiteContentItem[]>(res)
  return Array.isArray(data) ? data : []
}

export async function updateAdminSiteContent(
  key: string,
  payload: { title: string; bodyMd: string },
): Promise<SiteContentItem> {
  const res = await secureFetch(`/api/billing/crm/site-content/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('保存站点内容失败')
  }
  return parseResponse<SiteContentItem>(res)
}

export async function fetchAuditLogs(params: {
  action?: string
  actorId?: number
  pageCurrent?: number
  pageSize?: number
}): Promise<AuditLogPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params.pageCurrent ?? 1),
    pageSize: String(params.pageSize ?? 20),
  })
  if (params.action?.trim()) search.set('action', params.action.trim())
  if (params.actorId != null) search.set('actorId', String(params.actorId))
  const res = await secureFetch(`/api/billing/crm/audit-log?${search.toString()}`)
  if (!res.ok) {
    throw new Error('加载审计日志失败')
  }
  const data = await parseResponse<AuditLogPage>(res)
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    totalCount: data?.totalCount ?? 0,
    pageCurrent: data?.pageCurrent ?? 1,
    pageSize: data?.pageSize ?? 20,
  }
}

export type SiteSettingsMap = Record<string, boolean | string | number>

export async function fetchAdminSiteSettings(): Promise<SiteSettingsMap> {
  const res = await secureFetch('/api/billing/crm/settings')
  if (!res.ok) {
    throw new Error('加载系统参数失败')
  }
  const data = await parseResponse<{ settings: SiteSettingsMap }>(res)
  return data?.settings ?? {}
}

export async function updateAdminSiteSettings(settings: SiteSettingsMap): Promise<SiteSettingsMap> {
  const res = await secureFetch('/api/billing/crm/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
  if (!res.ok) {
    throw new Error('保存系统参数失败')
  }
  const data = await parseResponse<{ settings: SiteSettingsMap }>(res)
  return data?.settings ?? settings
}
