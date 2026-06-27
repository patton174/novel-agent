import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface OrchestratorState {
  goal: string
  status: string
  runningJobCount: number
  maxConcurrentJobs: number
  lastDecision: string
  updatedAt: number
  agentEnabled?: boolean | null
  agentLlmConfigured?: boolean | null
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchOrchestratorState(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator')
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadOrchestratorStateFail'))
  return parseResponse<OrchestratorState>(res)
}

export async function setOrchestratorGoal(goal: string): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  })
  if (!res.ok) throw new Error(i18n.t('admin:errors.setOrchestratorGoalFail'))
  return parseResponse<OrchestratorState>(res)
}

export async function wakeOrchestrator(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/wake', { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.wakeOrchestratorFail'))
  return parseResponse<OrchestratorState>(res)
}

export async function clearOrchestratorGoal(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/clear', { method: 'POST' })
  if (!res.ok) throw new Error(i18n.t('admin:errors.clearOrchestratorGoalFail'))
  return parseResponse<OrchestratorState>(res)
}

export interface OrchestratorDecisionEntry {
  seq: number
  ts: number
  message: string
}

export interface OrchestratorDecisionsResponse {
  logs: OrchestratorDecisionEntry[]
  maxSeq: number
}

export async function fetchOrchestratorDecisions(
  afterSeq = 0,
  limit = 100,
): Promise<OrchestratorDecisionsResponse> {
  const params = new URLSearchParams({
    afterSeq: String(afterSeq),
    limit: String(limit),
  })
  const res = await secureFetch(`/api/content/crm/crawl/orchestrator/decisions?${params}`)
  if (!res.ok) throw new Error(i18n.t('admin:errors.loadOrchestratorDecisionsFail'))
  return parseResponse<OrchestratorDecisionsResponse>(res)
}
