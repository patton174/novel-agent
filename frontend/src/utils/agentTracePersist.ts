import type {
  AgentStepState,
  AgentTimelineBlock,
  AgentTodoItem,
} from '../types/agent'

export interface AgentRunTracePayload {
  thinkText?: string
  stepStates?: AgentStepState[]
  timeline?: AgentTimelineBlock[]
  todos?: AgentTodoItem[]
}

export function buildAgentRunTraceJson(payload: AgentRunTracePayload): string {
  return JSON.stringify({
    thinkText: payload.thinkText ?? '',
    stepStates: payload.stepStates ?? [],
    timeline: payload.timeline ?? [],
    todos: payload.todos ?? [],
  })
}

const ASSISTANT_FALLBACK_SNIPPET = '没有生成可展示正文'

export function isAssistantFallbackContent(content: string | undefined): boolean {
  return Boolean(content?.includes(ASSISTANT_FALLBACK_SNIPPET))
}

export function parseAgentRunTraceJson(raw: string | undefined | null): AgentRunTracePayload | null {
  if (!raw?.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      thinkText: typeof parsed.thinkText === 'string' ? parsed.thinkText : undefined,
      stepStates: Array.isArray(parsed.stepStates)
        ? (parsed.stepStates as AgentStepState[])
        : undefined,
      timeline: Array.isArray(parsed.timeline)
        ? (parsed.timeline as AgentTimelineBlock[])
        : undefined,
      todos: Array.isArray(parsed.todos) ? (parsed.todos as AgentTodoItem[]) : undefined,
    }
  } catch {
    return null
  }
}

export function applyTraceToAssistantMessage<
  T extends {
    role: string
    content: string
    agentThinkText?: string
    agentSteps?: AgentStepState[]
    agentTimeline?: AgentTimelineBlock[]
    agentTodos?: AgentTodoItem[]
    agentRunId?: string
  },
>(message: T, trace: AgentRunTracePayload | null | undefined, runId?: string): T {
  if (message.role !== 'assistant' || !trace) {
    return message
  }
  const hasSteps = Boolean(trace.stepStates?.length)
  const hasTimeline = Boolean(trace.timeline?.length)
  const hasThink = Boolean(trace.thinkText?.trim())
  const hasTodos = Boolean(trace.todos?.length)
  if (!hasSteps && !hasTimeline && !hasThink && !hasTodos) {
    return message
  }
  const content =
    isAssistantFallbackContent(message.content) && hasTimeline
      ? message.content
      : message.content
  return {
    ...message,
    content,
    agentRunId: runId ?? message.agentRunId,
    agentThinkText: trace.thinkText ?? message.agentThinkText,
    agentSteps: trace.stepStates ?? message.agentSteps,
    agentTimeline: trace.timeline ?? message.agentTimeline,
    agentTodos: trace.todos ?? message.agentTodos,
  }
}
