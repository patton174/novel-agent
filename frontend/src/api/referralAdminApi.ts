import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface ReferralReferrerRow {
  userId: string
  username: string | null
  code: string
  referralCount: number
  paidCount: number
  conversionRate: number
}

export interface ReferralStatsOverview {
  totalReferrals: number
  totalPaid: number
  conversionRate: number
  topReferrers: ReferralReferrerRow[]
}

export async function fetchReferralStats(params?: {
  limit?: number
}): Promise<ReferralStatsOverview> {
  const search = new URLSearchParams()
  if (params?.limit != null) {
    search.set('limit', String(params.limit))
  }
  const qs = search.toString()
  const res = await secureFetch(
    `/api/billing/crm/referrals${qs ? `?${qs}` : ''}`,
  )
  if (!res.ok) {
    throw new Error(i18n.t('admin:referral.errors.loadStats'))
  }
  const data = await parseResultResponse<ReferralStatsOverview>(res)
  return {
    totalReferrals: data?.totalReferrals ?? 0,
    totalPaid: data?.totalPaid ?? 0,
    conversionRate: data?.conversionRate ?? 0,
    topReferrers: Array.isArray(data?.topReferrers) ? data.topReferrers : [],
  }
}
