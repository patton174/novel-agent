import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '../utils/resultApi'

export type InviteRewardType = 'none' | 'quota_bonus' | 'plan_trial'
export type InviteCodeStatus = 'active' | 'disabled'

export interface InviteRewardPayload {
  tokenBonus?: number | null
  runBonus?: number | null
  planCode?: string | null
  days?: number | null
}

export interface AdminInviteCode {
  id: number
  code: string
  createdBy: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  rewardType: InviteRewardType
  rewardPayload: InviteRewardPayload | null
  status: InviteCodeStatus
  createdAt: string
}

export interface AdminInviteCodeUpsertPayload {
  code?: string | null
  maxUses?: number
  expiresAt?: string | null
  rewardType?: InviteRewardType
  rewardPayload?: InviteRewardPayload | null
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(i18n.t('admin:errors.noAdminPermission'))
    }
    throw new Error(await readApiErrorMessage(res))
  }
  return parseResultResponse<T>(res)
}

function normalizeInviteCode(raw: AdminInviteCode): AdminInviteCode {
  return {
    ...raw,
    rewardPayload: raw.rewardPayload ?? null,
    maxUses: raw.maxUses ?? 0,
    usedCount: raw.usedCount ?? 0,
  }
}

export async function fetchAdminInviteCodes(): Promise<AdminInviteCode[]> {
  const res = await secureFetch('/api/auth/crm/invite-codes')
  const data = await parseResponse<AdminInviteCode[]>(res)
  return Array.isArray(data) ? data.map(normalizeInviteCode) : []
}

export async function createAdminInviteCode(
  payload: AdminInviteCodeUpsertPayload,
): Promise<AdminInviteCode> {
  const res = await secureFetch('/api/auth/crm/invite-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return normalizeInviteCode(await parseResponse<AdminInviteCode>(res))
}

export async function updateAdminInviteCode(
  id: number,
  payload: AdminInviteCodeUpsertPayload,
): Promise<AdminInviteCode> {
  const res = await secureFetch(`/api/auth/crm/invite-codes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return normalizeInviteCode(await parseResponse<AdminInviteCode>(res))
}

export async function disableAdminInviteCode(id: number): Promise<AdminInviteCode> {
  const res = await secureFetch(`/api/auth/crm/invite-codes/${id}/disable`, {
    method: 'POST',
  })
  return normalizeInviteCode(await parseResponse<AdminInviteCode>(res))
}

export function formatInviteUses(code: AdminInviteCode, unlimitedLabel: string): string {
  const max = code.maxUses
  if (max === 0) {
    return `${code.usedCount} / ${unlimitedLabel}`
  }
  return `${code.usedCount} / ${max}`
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
