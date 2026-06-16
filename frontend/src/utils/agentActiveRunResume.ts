import type { AgentEventEnvelope } from '../types/agent'

const RESUMABLE_STATUSES = new Set(['QUEUED', 'RUNNING', 'WAITING_USER'])

export function isResumableAgentRunStatus(status: string | undefined | null): boolean {
  return RESUMABLE_STATUSES.has(String(status || '').toUpperCase())
}

export function parseStoredAgentEvent(payloadJson: string): AgentEventEnvelope | null {
  try {
    const parsed = JSON.parse(payloadJson) as AgentEventEnvelope
    if (!parsed || typeof parsed.type !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
