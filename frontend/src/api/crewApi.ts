import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import type {
  CreateCrewTemplateInput,
  CrewStageDef,
  CrewTemplateDetail,
  CrewTemplateSummary,
  UpdateCrewTemplateInput,
} from '../types/crew'
import { parseResultResponse } from '../utils/resultApi'

const BASE = '/api/agent/crews'

interface ApiRow {
  id: string
  display_name: string
  description?: string | null
  is_system: boolean
  stages?: Array<Record<string, unknown>> | null
}

function mapStages(raw: Array<Record<string, unknown>> | null | undefined): CrewStageDef[] {
  if (!raw) return []
  return raw.map((row) => ({
    key: String(row.key ?? ''),
    profileId: String(row.profileId ?? row.profile_id ?? 'chapter-writer'),
    promptTemplate: String(row.promptTemplate ?? row.prompt_template ?? ''),
    gate: (row.gate as CrewStageDef['gate']) ?? 'always',
    onFail: (row.onFail ?? row.on_fail) as CrewStageDef['onFail'],
    outputSchema: String(row.outputSchema ?? row.output_schema ?? 'none'),
  }))
}

function mapSummary(row: ApiRow): CrewTemplateSummary {
  const stages = row.stages ?? []
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description ?? undefined,
    isSystem: row.is_system,
    stageCount: stages.length,
  }
}

function mapDetail(row: ApiRow): CrewTemplateDetail {
  return {
    id: row.id,
    displayName: row.display_name,
    description: row.description ?? undefined,
    isSystem: row.is_system,
    stages: mapStages(row.stages),
  }
}

export async function fetchCrewTemplates(): Promise<CrewTemplateSummary[]> {
  const res = await secureFetch(BASE)
  if (!res.ok) throw new Error(i18n.t('admin:crew.loadFail', { defaultValue: 'Load failed' }))
  const rows = await parseResultResponse<ApiRow[]>(res)
  return rows.map(mapSummary)
}

export async function fetchCrewTemplate(id: string): Promise<CrewTemplateDetail> {
  const res = await secureFetch(`${BASE}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(i18n.t('admin:crew.loadFail', { defaultValue: 'Load failed' }))
  return mapDetail(await parseResultResponse<ApiRow>(res))
}

export interface CrewStageValidationResult {
  valid: boolean
  errors: string[]
}

export function validateCrewStages(stages: CrewStageDef[]): CrewStageValidationResult {
  const errors: string[] = []
  if (!stages.length) errors.push('At least one stage required')
  const keys = new Set<string>()
  for (const s of stages) {
    if (!s.key?.trim()) errors.push('Stage key required')
    else if (keys.has(s.key)) errors.push(`Duplicate stage key: ${s.key}`)
    else keys.add(s.key)
    if (!s.profileId?.trim()) errors.push(`Stage ${s.key || '?'}: profileId required`)
  }
  return { valid: errors.length === 0, errors }
}

/** System crews are read-only; user CRUD reserved for a follow-up release. */
export async function createCrewTemplate(_input: CreateCrewTemplateInput): Promise<CrewTemplateDetail> {
  throw new Error(i18n.t('admin:crew.readOnly', { defaultValue: 'Custom crew templates coming soon' }))
}

export async function updateCrewTemplate(
  _id: string,
  _input: UpdateCrewTemplateInput,
): Promise<CrewTemplateDetail> {
  throw new Error(i18n.t('admin:crew.readOnly', { defaultValue: 'System crews are read-only' }))
}

export async function deleteCrewTemplate(_id: string): Promise<void> {
  throw new Error(i18n.t('admin:crew.readOnly', { defaultValue: 'System crews are read-only' }))
}

export type { CrewTemplateSummary }
