import type {
  AgentAssistantStreamPhase,
  AgentContextUsage,
  AgentStepState,
  AgentTimelineBlock,
  AgentTodoItem,
} from './agent'
import { buildWelcomeMessage } from '../utils/buildWelcomeMessage'
import type { Novel } from './novel'

export interface EditorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinking?: string
  writing?: {
    status: 'idle' | 'writing' | 'done'
    content: string
  }
  toolCalls?: Array<{
    name: string
    status: 'pending' | 'done'
    result?: string
  }>
  skillCalls?: Array<{
    name: string
    status: 'pending' | 'done'
  }>
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
  /** TodoWrite 合并后的任务清单（消息顶栏固定展示） */
  agentTodos?: AgentTodoItem[]
  agentContextUsage?: AgentContextUsage
  /** 流式段缓冲（message.completed 前；不落盘 sessionStorage） */
  agentStreamingContent?: string
  agentSegmentOpen?: boolean
}

export interface EditorChatSession {
  id: string
  title: string
  updatedAt: Date
}

/** @deprecated legacy flat memory — panel uses memory_node tree via useEditorStoryMemory */
export type EditorStoryMemoryState = Record<string, never>

export const INITIAL_ASSISTANT_MESSAGE: EditorMessage = {
  id: '1',
  role: 'assistant',
  content: buildWelcomeMessage(null),
  timestamp: new Date(),
}

export function isWelcomeOnlyAssistantMessage(
  message: Pick<EditorMessage, 'role' | 'content' | 'agentSteps' | 'agentTimeline' | 'agentThinkText'>,
  novel: Novel | null | undefined,
): boolean {
  if (message.role !== 'assistant') {
    return false
  }
  if (message.agentSteps?.length || message.agentTimeline?.length || message.agentThinkText?.trim()) {
    return false
  }
  const welcome = buildWelcomeMessage(novel)
  return message.content?.trim() === welcome.trim()
}

export function createWelcomeMessages(novel: Novel | null): EditorMessage[] {
  return [{
    ...INITIAL_ASSISTANT_MESSAGE,
    content: buildWelcomeMessage(novel),
    timestamp: new Date(),
  }]
}

/** 尚无用户消息，仅含欢迎语（或为空）的初始对话 */
export function isInitialChatView(
  messages: EditorMessage[],
  novel: Novel | null | undefined,
): boolean {
  if (messages.some((m) => m.role === 'user')) {
    return false
  }
  return messages.every(
    (m) => m.role !== 'assistant' || isWelcomeOnlyAssistantMessage(m, novel),
  )
}

export function filterVisibleChatMessages(
  messages: EditorMessage[],
  novel: Novel | null | undefined,
): EditorMessage[] {
  return messages.filter(
    (m) => m.role === 'user' || !isWelcomeOnlyAssistantMessage(m, novel),
  )
}
