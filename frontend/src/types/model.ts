export type ModelType = 'llm' | 'embedding' | 'crawl' | 'image'

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
  byok: boolean
  isDefault: boolean
}

export interface AvailableModels {
  publicModels: AiModel[]
  byok: UserModel[]
}

export interface ByokUpsertReq {
  label: string
  modelType?: ModelType
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKey?: string
}
