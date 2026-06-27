export type ModelType = 'llm' | 'embedding' | 'image'

export interface AiModel {
  id: string
  code: string
  displayName: string
  modelType: ModelType
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKeyMasked: string
  maxTokens?: number | null
  temperature?: number | null
  inputPricePer1kMicros?: number | null
  outputPricePer1kMicros?: number | null
  priceMultiplier: number
  active: boolean
  isDefault: boolean
  sortOrder: number
  description?: string | null
  planCodes: string[]
  credentialId?: string | null
  credentialLabel?: string | null
}

export interface UserModel {
  id: string
  modelType: ModelType
  publicModelId?: string | null
  publicModel?: AiModel | null
  label?: string | null
  provider?: string | null
  protocol?: string | null
  modelName?: string | null
  baseUrl?: string | null
  credentialId?: string | null
  credentialLabel?: string | null
  byok: boolean
  isDefault: boolean
}

export interface ModelCredential {
  id: string
  label: string
  provider: string
  protocol: string
  baseUrl: string
  apiKeyMasked: string
  modelCount: number
}

export interface AvailableModels {
  publicModels: AiModel[]
  byok: UserModel[]
  credentials?: ModelCredential[]
}

export interface ByokUpsertReq {
  credentialId?: string
  credentialLabel?: string
  label: string
  modelType?: ModelType
  provider?: string
  protocol?: string
  modelName: string
  baseUrl?: string
  apiKey?: string
}

export interface CredentialUpsertReq {
  label: string
  provider: string
  protocol: string
  baseUrl: string
  apiKey?: string
}
