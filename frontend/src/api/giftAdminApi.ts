import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '../utils/resultApi'

export type GiftType = 'quota_bonus' | 'plan_trial' | 'license_key' | 'idr_coupon'
export type GiftCampaignStatus = 'active' | 'disabled'
export type GiftCodeStatus = 'available' | 'redeemed' | 'disabled'

export interface GiftRewardPayload {
  tokenBonus?: number | null
  runBonus?: number | null
  planCode?: string | null
  days?: number | null
  idrProjectId?: string | null
  idrSkuId?: string | null
  couponCode?: string | null
}

export interface AdminGiftCampaign {
  id: number
  name: string
  giftType: GiftType
  rewardPayload: GiftRewardPayload | null
  maxRedemptions: number | null
  redeemedCount: number
  codeCount: number
  expiresAt: string | null
  status: GiftCampaignStatus
  createdAt: string
}

export interface AdminGiftCampaignUpsertPayload {
  name: string
  giftType: GiftType
  rewardPayload?: GiftRewardPayload | null
  maxRedemptions?: number | null
  expiresAt?: string | null
}

export interface AdminGiftCode {
  id: number
  campaignId: number
  code: string
  status: GiftCodeStatus
  userId: string | null
  redeemedAt: string | null
  createdAt: string
}

export interface GenerateGiftCodesResult {
  campaignId: number
  codes: string[]
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

function normalizeCampaign(raw: AdminGiftCampaign): AdminGiftCampaign {
  return {
    ...raw,
    rewardPayload: raw.rewardPayload ?? null,
    redeemedCount: raw.redeemedCount ?? 0,
    codeCount: raw.codeCount ?? 0,
  }
}

export async function fetchAdminGiftCampaigns(): Promise<AdminGiftCampaign[]> {
  const res = await secureFetch('/api/billing/crm/gift-campaigns')
  const data = await parseResponse<AdminGiftCampaign[]>(res)
  return Array.isArray(data) ? data.map(normalizeCampaign) : []
}

export async function fetchAdminGiftCampaign(id: number): Promise<AdminGiftCampaign> {
  const res = await secureFetch(`/api/billing/crm/gift-campaigns/${id}`)
  return normalizeCampaign(await parseResponse<AdminGiftCampaign>(res))
}

export async function createAdminGiftCampaign(
  payload: AdminGiftCampaignUpsertPayload,
): Promise<AdminGiftCampaign> {
  const res = await secureFetch('/api/billing/crm/gift-campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return normalizeCampaign(await parseResponse<AdminGiftCampaign>(res))
}

export async function updateAdminGiftCampaign(
  id: number,
  payload: AdminGiftCampaignUpsertPayload,
): Promise<AdminGiftCampaign> {
  const res = await secureFetch(`/api/billing/crm/gift-campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return normalizeCampaign(await parseResponse<AdminGiftCampaign>(res))
}

export async function disableAdminGiftCampaign(id: number): Promise<AdminGiftCampaign> {
  const res = await secureFetch(`/api/billing/crm/gift-campaigns/${id}/disable`, {
    method: 'POST',
  })
  return normalizeCampaign(await parseResponse<AdminGiftCampaign>(res))
}

export async function generateAdminGiftCodes(
  campaignId: number,
  count: number,
): Promise<GenerateGiftCodesResult> {
  const res = await secureFetch(`/api/billing/crm/gift-campaigns/${campaignId}/generate-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  })
  const data = await parseResponse<GenerateGiftCodesResult>(res)
  return {
    campaignId: data.campaignId ?? campaignId,
    codes: Array.isArray(data.codes) ? data.codes : [],
  }
}

export async function fetchAdminGiftCodes(campaignId: number): Promise<AdminGiftCode[]> {
  const res = await secureFetch(`/api/billing/crm/gift-campaigns/${campaignId}/codes`)
  const data = await parseResponse<AdminGiftCode[]>(res)
  return Array.isArray(data) ? data : []
}
