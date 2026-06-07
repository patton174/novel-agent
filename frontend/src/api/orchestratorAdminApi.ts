import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface OrchestratorState {
  goal: string
  status: string
  runningJobCount: number
  maxConcurrentJobs: number
  lastDecision: string
  updatedAt: number
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchOrchestratorState(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator')
  if (!res.ok) throw new Error('加载编排器状态失败')
  return parseResponse<OrchestratorState>(res)
}

export async function setOrchestratorGoal(goal: string): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  })
  if (!res.ok) throw new Error('设定目标失败')
  return parseResponse<OrchestratorState>(res)
}

export async function wakeOrchestrator(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/wake', { method: 'POST' })
  if (!res.ok) throw new Error('唤醒失败')
  return parseResponse<OrchestratorState>(res)
}

export async function clearOrchestratorGoal(): Promise<OrchestratorState> {
  const res = await secureFetch('/api/content/crm/crawl/orchestrator/clear', { method: 'POST' })
  if (!res.ok) throw new Error('清空目标失败')
  return parseResponse<OrchestratorState>(res)
}
