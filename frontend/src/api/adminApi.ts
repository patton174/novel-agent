import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { UserRole } from '../stores/userStore'

export interface PlatformStats {
  totalUsers: number
  todayRegistrations: number
  activeUsers: number
}

export interface ContentStats {
  totalNovels: number
  totalChapters: number
  totalAgentRuns: number
}

export interface TrendPoint {
  date: string
  count: number
}

export interface StatsTrends {
  registrationTrend: TrendPoint[]
  agentRunTrend: TrendPoint[]
}

export interface AdminUser {
  id: number
  username: string
  email: string
  role: UserRole
  isActive: boolean
  emailVerified?: boolean | null
}

export interface AdminUserPage {
  list: AdminUser[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface AdminUserUpdatePayload {
  role: UserRole
  isActive: boolean
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await secureFetch('/api/auth/crm/stats/overview')
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载平台统计失败')
  }
  return parseResponse<PlatformStats>(res)
}

export async function fetchContentStats(): Promise<ContentStats> {
  const res = await secureFetch('/api/content/crm/stats/overview')
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载内容统计失败')
  }
  return parseResponse<ContentStats>(res)
}

export async function fetchStatsTrends(days = 30): Promise<StatsTrends> {
  const res = await secureFetch(`/api/content/crm/stats/trends?days=${days}`)
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载趋势数据失败')
  }
  const data = await parseResponse<StatsTrends>(res)
  return {
    registrationTrend: Array.isArray(data.registrationTrend) ? data.registrationTrend : [],
    agentRunTrend: Array.isArray(data.agentRunTrend) ? data.agentRunTrend : [],
  }
}

export async function fetchUserPage(params: {
  pageCurrent: number
  pageSize: number
  usernameKeyword?: string
}): Promise<AdminUserPage> {
  const search = new URLSearchParams({
    pageCurrent: String(params.pageCurrent),
    pageSize: String(params.pageSize),
  })
  if (params.usernameKeyword?.trim()) {
    search.set('usernameKeyword', params.usernameKeyword.trim())
  }
  const res = await secureFetch(`/api/auth/crm/user/page?${search.toString()}`)
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载用户列表失败')
  }
  return parseResponse<AdminUserPage>(res)
}

export async function fetchUserDetail(id: number): Promise<AdminUser> {
  const res = await secureFetch(`/api/auth/crm/user/${id}`)
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载用户详情失败')
  }
  return parseResponse<AdminUser>(res)
}

export async function updateUser(
  id: number,
  payload: AdminUserUpdatePayload,
): Promise<AdminUser> {
  const res = await secureFetch(`/api/auth/crm/user/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '更新用户失败')
  }
  return parseResponse<AdminUser>(res)
}
