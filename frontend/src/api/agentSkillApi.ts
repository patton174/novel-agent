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
  }
}

function mapDetail(row: ApiAgentSkillRow): AgentSkillDetail {
  return {
    ...mapSummary(row),
    content: row.content ?? '',
  }
}

export async function fetchAgentSkills(): Promise<AgentSkillSummary[]> {
  const res = await secureFetch(BASE)
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
