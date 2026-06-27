import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type {
  AgentSkillDetail,
  AgentSkillSummary,
  CreateAgentSkillInput,
  UpdateAgentSkillInput,
} from '../types/agentSkill'

const BASE = '/api/admin/agent/skills'

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
}

function mapSummary(row: ApiAgentSkillRow): AgentSkillSummary {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? undefined,
    locale: row.locale,
    isSystem: true,
    version: row.version,
    tools: row.tools ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }
}

function mapDetail(row: ApiAgentSkillRow): AgentSkillDetail {
  return {
    ...mapSummary(row),
    content: row.content ?? '',
  }
}

export async function fetchAdminAgentSkills(): Promise<AgentSkillSummary[]> {
  const res = await secureFetch(BASE)
  if (!res.ok) throw new Error(i18n.t('admin:skills.loadFail'))
  const rows = await parseResultResponse<ApiAgentSkillRow[]>(res)
  return rows.map(mapSummary)
}

export async function fetchAdminAgentSkill(id: string): Promise<AgentSkillDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(i18n.t('admin:skills.loadFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function createAdminAgentSkill(
  input: CreateAgentSkillInput,
): Promise<AgentSkillDetail> {
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
  if (!res.ok) throw new Error(i18n.t('admin:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function updateAdminAgentSkill(
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
  if (!res.ok) throw new Error(i18n.t('admin:skills.saveFail'))
  const row = await parseResultResponse<ApiAgentSkillRow>(res)
  return mapDetail(row)
}

export async function deleteAdminAgentSkill(id: string): Promise<void> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('admin:skills.deleteFail'))
  await parseResultResponse<void>(res)
}
