export interface UpgradeRequest {
  id: string
  userId: number
  requestType: string
  targetValue: string
  reason?: string | null
  status: string
  reviewedBy?: number | null
  reviewedAt?: string | null
  reviewNote?: string | null
  createdAt: string
}

export interface RedemptionCode {
  id: string
  code: string
  type: string
  value: string
  maxUses: number
  usedCount: number
  expiresAt?: string | null
  createdBy?: number | null
  createdAt: string
}

export interface RedemptionCodePage {
  list: RedemptionCode[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface UpgradeRequestPage {
  list: UpgradeRequest[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface UsageOverageRow {
  userId: number
  periodYyyyMm: string
  tokensUsed: number
  runsUsed: number
  costMicros: number
  overageMicros: number
  quotaTokens?: number | null
  quotaRuns?: number | null
  updatedAt?: string | null
}
