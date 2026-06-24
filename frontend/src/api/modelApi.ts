import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type {
  AiModel,
  AvailableModels,
  ByokUpsertReq,
  CredentialUpsertReq,
  ModelCredential,
  UserModel,
} from '../types/model'

const CRM = '/api/content/crm/model'
const AUTH = '/api/content/auth/model'

export async function adminListModels(type?: string): Promise<AiModel[]> {
  const res = await secureFetch(`${CRM}?type=${type ?? ''}`)
  if (!res.ok) throw new Error(res.status === 403 ? '无管理权限' : '加载模型失败')
  return parseResultResponse<AiModel[]>(res)
}

export async function adminCreateModel(
  req: Partial<AiModel> & { apiKey?: string; credentialId?: string; credentialLabel?: string },
): Promise<AiModel> {
  const res = await secureFetch(CRM, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('创建失败')
  return parseResultResponse<AiModel>(res)
}

export async function adminUpdateModel(
  id: string,
  req: Partial<AiModel> & { apiKey?: string },
): Promise<AiModel> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('更新失败')
  return parseResultResponse<AiModel>(res)
}

export async function adminDeleteModel(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function adminSetPlans(id: string, planCodes: string[]): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/plans`, {
    method: 'PUT',
    body: JSON.stringify({ planCodes }),
  })
  if (!res.ok) throw new Error('设置套餐失败')
}

export async function adminSetDefault(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/default`, { method: 'POST' })
  if (!res.ok) throw new Error('设默认失败')
}

export async function adminTestModel(
  id: string,
): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  const res = await secureFetch(`${CRM}/${id}/test`, { method: 'POST' })
  if (!res.ok) throw new Error('测试失败')
  return parseResultResponse<{ ok: boolean; error?: string; latencyMs?: number }>(res)
}

export async function adminReorderModels(type: string, ids: string[]): Promise<void> {
  const res = await secureFetch(`${CRM}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ type, ids }),
  })
  if (!res.ok) throw new Error('排序失败')
}

export async function adminListCredentials(type: string): Promise<ModelCredential[]> {
  const res = await secureFetch(`${CRM}/credentials?type=${type}`)
  if (!res.ok) throw new Error('加载 API 连接失败')
  return parseResultResponse<ModelCredential[]>(res)
}

export async function adminCreateCredential(type: string, req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${CRM}/credentials?type=${type}`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error('创建 API 连接失败')
  return parseResultResponse<ModelCredential>(res)
}

export async function adminUpdateCredential(id: string, req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${CRM}/credentials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error('更新 API 连接失败')
  return parseResultResponse<ModelCredential>(res)
}

export async function adminDeleteCredential(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/credentials/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除 API 连接失败')
}

export async function fetchAvailableModels(type = 'llm'): Promise<AvailableModels> {
  const res = await secureFetch(`${AUTH}/available?type=${type}`)
  if (!res.ok) throw new Error('加载可用模型失败')
  return parseResultResponse<AvailableModels>(res)
}

export async function fetchDefaultModel(type = 'llm'): Promise<UserModel | null> {
  const res = await secureFetch(`${AUTH}/default?type=${type}`)
  if (!res.ok) throw new Error('加载默认模型失败')
  return parseResultResponse<UserModel | null>(res)
}

export async function setDefaultModel(type: string, userModelId: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/default`, {
    method: 'PUT',
    body: JSON.stringify({ type, userModelId }),
  })
  if (!res.ok) throw new Error('设置默认失败')
}

export async function createByok(req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok`, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('创建私有模型失败')
  return parseResultResponse<UserModel>(res)
}

export async function updateByok(id: string, req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('更新私有模型失败')
  return parseResultResponse<UserModel>(res)
}

export async function deleteByok(id: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除私有模型失败')
}

export async function fetchCredentials(): Promise<ModelCredential[]> {
  const res = await secureFetch(`${AUTH}/credentials`)
  if (!res.ok) throw new Error('加载 API 连接失败')
  return parseResultResponse<ModelCredential[]>(res)
}

export async function createCredential(req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${AUTH}/credentials`, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('创建 API 连接失败')
  return parseResultResponse<ModelCredential>(res)
}

export async function updateCredential(
  id: string,
  req: CredentialUpsertReq,
): Promise<ModelCredential> {
  const res = await secureFetch(`${AUTH}/credentials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error('更新 API 连接失败')
  return parseResultResponse<ModelCredential>(res)
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/credentials/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除 API 连接失败')
}
