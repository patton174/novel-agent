import type { EditorMessage } from '../types/editor'
import {
  applyTraceToAssistantMessage,
  parseAgentRunTraceJson,
} from './agentTracePersist'

export function contentMessageToEditorMessage(m: {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  runId?: string
  agentTraceJson?: string
}): EditorMessage {
  const base: EditorMessage = {
    id: m.id || `${m.role}-${m.createdAt}`,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt),
    agentRunId: m.runId,
    agentStreamPhase: m.role === 'assistant' ? 'completed' : undefined,
  }
  if (m.role !== 'assistant') {
    return base
  }
  const trace = parseAgentRunTraceJson(m.agentTraceJson)
  return applyTraceToAssistantMessage(base, trace, m.runId)
}
