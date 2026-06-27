import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type {
  AgentSkillDetail,
  AgentSkillSummary,
  CreateAgentSkillInput,
  UpdateAgentSkillInput,
} from '../types/agentSkill'

const BASE = '/api/agent/skills'

interface ApiAgentSkillRow {
  id: string
  name: string
  description?: string | null
  locale: string
  is_system: boolean
  version: number
  tools?: string[] | null
  content?: string | null
  updated_at?: string | null
  pinned_version?: number | null
  auto_update?: boolean | null
  update_available?: boolean | null
  in_library?: boolean | null
  enabled?: boolean | null
}

function mapSummary(row: ApiAgentSkillRow): AgentSkillSummary {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? undefined,
    locale: row.locale,
    isSystem: row.is_system,
    version: row.version,
    tools: row.tools ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    pinnedVersion: row.pinned_version ?? undefined,
    autoUpdate: row.auto_update ?? undefined,
    updateAvailable: row.update_available ?? undefined,
    inLibrary: row.in_library ?? undefined,
    enabled: row.enabled ?? true,
  }
}

function mapDetail(row: ApiAgentSkillRow): AgentSkillDetail {
  return {
    ...mapSummary(row),
    content: row.content ?? '',
  }
}

export async function fetchAgentSkillLibrary(): Promise<AgentSkillSummary[]> {
  const res = await secureFetch(`${BASE}/library`)
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.loadFail'))
  const rows = await parseResultResponse<ApiAgentSkillRow[]>(res)
  return rows.map(mapSummary)
}

/** @deprecated use fetchAgentSkillLibrary */
export async function fetchAgentSkills(): Promise<AgentSkillSummary[]> {
  return fetchAgentSkillLibrary()
}

export async function fetchOfficialAgentSkills(): Promise<AgentSkillSummary[]> {
  const res = await secureFetch(`${BASE}/official`)
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.loadFail'))
  const rows = await parseResultResponse<ApiAgentSkillRow[]>(res)
  return rows.map(mapSummary)
}

export async function fetchAgentSkill(id: string): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.loadFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function createAgentSkill(input: CreateAgentSkillInput): Promise<AgentSkillDetail> {
  const res = await secureFetch(BASE, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      content: input.content,
      locale: input.locale ?? 'zh',
      tools: input.tools ?? [],
    }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function updateAgentSkill(
  id: string,
  input: UpdateAgentSkillInput,
): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      version: input.version,
      description: input.description,
      content: input.content,
      locale: input.locale ?? 'zh',
      tools: input.tools ?? [],
    }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function deleteAgentSkill(id: string): Promise<void> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.deleteFail'))
  await parseResultResponse<void>(res)
}

export async function ensureAgentSkillRef(id: string): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}/ref`, { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function updateAgentSkillRef(
  id: string,
  input: { autoUpdate?: boolean; pullLatest?: boolean; enabled?: boolean },
): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}/ref`, {
    method: 'PATCH',
    body: JSON.stringify({
      auto_update: input.autoUpdate,
      pull_latest: input.pullLatest,
      enabled: input.enabled,
    }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function removeAgentSkillRef(id: string): Promise<void> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}/ref`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  await parseResultResponse<void>(res)
}

export async function setAgentSkillEnabled(
  id: string,
  enabled: boolean,
): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}
