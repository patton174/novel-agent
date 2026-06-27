import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type {
  AgentProfileDetail,
  AgentProfileSummary,
  CreateAgentProfileInput,
  RunTreeNode,
  UpdateAgentProfileInput,
} from '../types/agentProfile'

const BASE = '/api/agent/profiles'

interface ApiRow {
  id: string
  display_name: string
  description?: string | null
  is_system: boolean
  max_turns?: number | null
  tool_allowlist?: string[] | null
  skill_ids?: string[] | null
  system_prompt_template?: string | null
  model_override?: string | null
  max_output_tokens?: number | null
}

function mapSummary(row: ApiRow): AgentProfileSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description ?? undefined,
    isSystem: row.is_system,
    maxTurns: row.max_turns ?? undefined,
    toolAllowlist: row.tool_allowlist ?? undefined,
    skillIds: row.skill_ids ?? undefined,
  }
}

function mapDetail(row: ApiRow): AgentProfileDetail {
  return {
    ...mapSummary(row),
    systemPromptTemplate: row.system_prompt_template ?? '',
    modelOverride: row.model_override ?? undefined,
    maxOutputTokens: row.max_output_tokens ?? undefined,
  }
}

export async function fetchAgentProfiles(): Promise<AgentProfileSummary[]> {
  const res = await secureFetch(BASE)
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.loadFail', { defaultValue: 'Load failed' }))
  const rows = await parseResultResponse<ApiRow[]>(res)
  return rows.map(mapSummary)
}

export async function fetchAgentProfile(id: string): Promise<AgentProfileDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.loadFail', { defaultValue: 'Load failed' }))
  const row = await parseResultResponse<ApiRow>(res)
  return mapDetail(row)
}

export async function createAgentProfile(input: CreateAgentProfileInput): Promise<AgentProfileDetail> {
  const res = await secureFetch(BASE, {
    method: 'POST',
    body: JSON.stringify({
      display_name: input.displayName,
      description: input.description,
      system_prompt_template: input.systemPromptTemplate,
      tool_allowlist: input.toolAllowlist ?? [],
      model_override: input.modelOverride,
      max_turns: input.maxTurns,
      max_output_tokens: input.maxOutputTokens,
      skill_ids: input.skillIds ?? [],
    }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.saveFail', { defaultValue: 'Save failed' }))
  return mapDetail(await parseResultResponse<ApiRow>(res))
}

export async function updateAgentProfile(
  id: string,
  input: UpdateAgentProfileInput,
): Promise<AgentProfileDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      display_name: input.displayName,
      description: input.description,
      system_prompt_template: input.systemPromptTemplate,
      tool_allowlist: input.toolAllowlist ?? [],
      model_override: input.modelOverride,
      max_turns: input.maxTurns,
      max_output_tokens: input.maxOutputTokens,
      skill_ids: input.skillIds ?? [],
    }),
  })
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.saveFail', { defaultValue: 'Save failed' }))
  return mapDetail(await parseResultResponse<ApiRow>(res))
}

export async function deleteAgentProfile(id: string): Promise<void> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.deleteFail', { defaultValue: 'Delete failed' }))
  await parseResultResponse<void>(res)
}

export async function cloneAgentProfile(id: string): Promise<AgentProfileDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}/clone`, { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('dashboard:agentProfiles.saveFail', { defaultValue: 'Clone failed' }))
  return mapDetail(await parseResultResponse<ApiRow>(res))
}

interface RunTreeApiNode {
  run_id: string
  profile_id?: string | null
  role_label?: string | null
  status: string
  started_at?: string | null
  ended_at?: string | null
  children?: RunTreeApiNode[] | null
}

function mapRunTreeNode(row: RunTreeApiNode): RunTreeNode {
  return {
    runId: row.run_id,
    profileId: row.profile_id ?? undefined,
    roleLabel: row.role_label ?? undefined,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    children: (row.children ?? []).map(mapRunTreeNode),
  }
}

export async function fetchRunTree(runId: string): Promise<RunTreeNode> {
  const res = await secureFetch(`/api/agent/runs/${encodeURIComponent(runId)}/tree`)
  if (!res.ok) throw new Error(i18n.t('editor:runTree.loadFail', { defaultValue: 'Failed to load run tree' }))
  return mapRunTreeNode(await parseResultResponse<RunTreeApiNode>(res))
}
