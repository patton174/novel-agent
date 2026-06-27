import i18n from '@/i18n'
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
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? i18n.t('admin:errors.noAdminPermission')
        : i18n.t('admin:errors.loadModelsFail'),
    )
  }
  return parseResultResponse<AiModel[]>(res)
}

export async function adminCreateModel(
  req: Partial<AiModel> & { apiKey?: string; credentialId?: string; credentialLabel?: string },
): Promise<AiModel> {
  const res = await secureFetch(CRM, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error(i18n.t('admin:errors.createFail'))
  return parseResultResponse<AiModel>(res)
}

export async function adminUpdateModel(
  id: string,
  req: Partial<AiModel> & { apiKey?: string },
): Promise<AiModel> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error(i18n.t('admin:errors.updateFail'))
  return parseResultResponse<AiModel>(res)
}

export async function adminDeleteModel(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.deleteFail'))
}

export async function adminSetPlans(id: string, planCodes: string[]): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/plans`, {
    method: 'PUT',
    body: JSON.stringify({ planCodes }),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.setPlansFail'))
}

export async function adminSetDefault(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/default`, { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.setDefaultFail'))
}

export async function adminTestModel(
  id: string,
): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  const res = await secureFetch(`${CRM}/${id}/test`, { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.testFail'))
  return parseResultResponse<{ ok: boolean; error?: string; latencyMs?: number }>(res)
}

export async function adminReorderModels(type: string, ids: string[]): Promise<void> {
  const res = await secureFetch(`${CRM}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ type, ids }),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.reorderFail'))
}

export async function adminListCredentials(type: string): Promise<ModelCredential[]> {
  const res = await secureFetch(`${CRM}/credentials?type=${type}`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadCredentialsFail'))
  return parseResultResponse<ModelCredential[]>(res)
}

export async function adminCreateCredential(type: string, req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${CRM}/credentials?type=${type}`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.createCredentialFail'))
  return parseResultResponse<ModelCredential>(res)
}

export async function adminUpdateCredential(id: string, req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${CRM}/credentials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.updateCredentialFail'))
  return parseResultResponse<ModelCredential>(res)
}

export async function adminDeleteCredential(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/credentials/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.deleteCredentialFail'))
}

export async function fetchAvailableModels(type = 'llm'): Promise<AvailableModels> {
  const res = await secureFetch(`${AUTH}/available?type=${type}`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadAvailableModelsFail'))
  return parseResultResponse<AvailableModels>(res)
}

export async function fetchDefaultModel(type = 'llm'): Promise<UserModel | null> {
  const res = await secureFetch(`${AUTH}/default?type=${type}`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadDefaultModelFail'))
  return parseResultResponse<UserModel | null>(res)
}

export async function setDefaultModel(type: string, userModelId: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/default`, {
    method: 'PUT',
    body: JSON.stringify({ type, userModelId }),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.setDefaultFail'))
}

export async function createByok(req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok`, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error(i18n.t('admin:errors.createByokFail'))
  return parseResultResponse<UserModel>(res)
}

export async function updateByok(id: string, req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error(i18n.t('admin:errors.updateByokFail'))
  return parseResultResponse<UserModel>(res)
}

export async function deleteByok(id: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.deleteByokFail'))
}

export async function fetchCredentials(): Promise<ModelCredential[]> {
  const res = await secureFetch(`${AUTH}/credentials`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadCredentialsFail'))
  return parseResultResponse<ModelCredential[]>(res)
}

export async function createCredential(req: CredentialUpsertReq): Promise<ModelCredential> {
  const res = await secureFetch(`${AUTH}/credentials`, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error(i18n.t('admin:errors.createCredentialFail'))
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
  if (!res.ok) throw new Error(i18n.t('admin:errors.updateCredentialFail'))
  return parseResultResponse<ModelCredential>(res)
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/credentials/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.deleteCredentialFail'))
}
