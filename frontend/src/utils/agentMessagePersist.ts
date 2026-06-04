import type {
  AgentAssistantStreamPhase,
  AgentContextUsage,
  AgentStepState,
  AgentTimelineBlock,
  AgentTodoItem,
} from '../types/agent'
import type { StoredChatMessage } from './chatSessionStore'

export interface PersistableAssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentThinkText?: string
  agentSteps?: AgentStepState[]
  agentActiveToolCount?: number
  agentIsThinking?: boolean
  agentStreamPaused?: boolean
  agentRunId?: string
  agentHostGuardMessage?: string
  agentStreamPhase?: AgentAssistantStreamPhase
  agentStreamError?: string
  agentAwaitingInteraction?: boolean
  agentTimeline?: AgentTimelineBlock[]
  agentTodos?: AgentTodoItem[]
  agentContextUsage?: AgentContextUsage
}

export function toStoredChatMessage(message: PersistableAssistantMessage): StoredChatMessage {
  const base: StoredChatMessage = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp.toISOString(),
  }
  if (message.role !== 'assistant') {
    return base
  }
  return {
    ...base,
    agentThinkText: message.agentThinkText,
    agentSteps: message.agentSteps,
    agentActiveToolCount: message.agentActiveToolCount,
    agentIsThinking: message.agentIsThinking,
    agentStreamPaused: message.agentStreamPaused,
    agentRunId: message.agentRunId,
    agentHostGuardMessage: message.agentHostGuardMessage,
    agentStreamPhase: message.agentStreamPhase,
    agentStreamError: message.agentStreamError,
    agentAwaitingInteraction: message.agentAwaitingInteraction,
    agentTimeline: message.agentTimeline,
    agentTodos: message.agentTodos,
    agentContextUsage: message.agentContextUsage,
  }
}

export function fromStoredChatMessage(stored: StoredChatMessage): PersistableAssistantMessage {
  return {
    id: stored.id,
    role: stored.role,
    content: stored.content,
    timestamp: new Date(stored.timestamp),
    agentThinkText: stored.agentThinkText,
    agentSteps: stored.agentSteps,
    agentActiveToolCount: stored.agentActiveToolCount,
    agentIsThinking: stored.agentIsThinking,
    agentStreamPaused: stored.agentStreamPaused,
    agentRunId: stored.agentRunId,
    agentHostGuardMessage: stored.agentHostGuardMessage,
    agentStreamPhase: stored.agentStreamPhase,
    agentStreamError: stored.agentStreamError,
    agentAwaitingInteraction: stored.agentAwaitingInteraction,
    agentTimeline: stored.agentTimeline,
    agentTodos: stored.agentTodos,
    agentContextUsage: stored.agentContextUsage,
  }
}
