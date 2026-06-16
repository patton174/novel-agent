import type { AgentEventEnvelope, AgentStreamUiState } from '../types/agent'
import { applyAgentEvent } from './agentStreamState'

const RESUMABLE_STATUSES = new Set(['QUEUED', 'RUNNING', 'WAITING_USER'])

export interface StoredAgentRunEventRow {
  sequence: number
  payloadJson: string
}

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

export function applyStoredRunEvents(
  state: AgentStreamUiState,
  events: StoredAgentRunEventRow[],
): AgentStreamUiState {
  let next = state
  for (const row of [...events].sort((a, b) => a.sequence - b.sequence)) {
    const envelope = parseStoredAgentEvent(row.payloadJson)
    if (!envelope) {
      continue
    }
    next = applyAgentEvent(next, 'agent-event', JSON.stringify(envelope))
  }
  return next
}

export function maxStoredEventSequence(
  events: Array<{ sequence: number }>,
  fallback = -1,
): number {
  let max = fallback
  for (const row of events) {
    if (row.sequence > max) {
      max = row.sequence
    }
  }
  return max
}

/** queued 模式下 run 进行中时是否应消费 status WS / 轮询事件 */
export function shouldFollowRunLiveEvents(state: AgentStreamUiState): boolean {
  return Boolean(state.runId) && !state.runTerminalAck && !state.isStreamEnded
}
