import i18n from '@/i18n'
import type {
  AgentAssistantStreamPhase,
  AgentContextUsage,
  AgentStepState,
  AgentTimelineBlock,
  AgentTodoItem,
} from '../types/agent'

export interface StoredChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
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

export interface StoredChatSession {
  id: string
  title: string
  updatedAt: string
  novelId?: string
}

const SESSIONS_KEY = 'novel-agent-chat-sessions'
const MESSAGES_KEY_PREFIX = 'novel-agent-chat-messages:'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function listSessions(): StoredChatSession[] {
  if (typeof localStorage === 'undefined') return []
  const sessions = safeParse<StoredChatSession[]>(localStorage.getItem(SESSIONS_KEY), [])
  return sessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export function upsertSession(session: StoredChatSession): void {
  if (typeof localStorage === 'undefined') return
  const existing = listSessions().find((s) => s.id === session.id)
  const merged: StoredChatSession = {
    id: session.id,
    title: session.title || existing?.title || i18n.t('editor:session.defaultTitle'),
    updatedAt: session.updatedAt || existing?.updatedAt || new Date().toISOString(),
    novelId: session.novelId ?? existing?.novelId,
  }
  const sessions = listSessions().filter((s) => s.id !== merged.id)
  sessions.unshift(merged)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function saveSessionMessages(sessionId: string, messages: StoredChatMessage[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`${MESSAGES_KEY_PREFIX}${sessionId}`, JSON.stringify(messages))
}

export function loadSessionMessages(sessionId: string): StoredChatMessage[] {
  if (typeof localStorage === 'undefined') return []
  return safeParse<StoredChatMessage[]>(
    localStorage.getItem(`${MESSAGES_KEY_PREFIX}${sessionId}`),
    [],
  )
}

export function listSessionsByNovel(novelId: string): StoredChatSession[] {
  return listSessions().filter((s) => s.novelId === novelId)
}

export function ensureSession(
  sessionId: string,
  title = i18n.t('editor:session.defaultTitle'),
  novelId?: string,
): StoredChatSession {
  const existing = listSessions().find((s) => s.id === sessionId)
  if (existing) {
    if (novelId && !existing.novelId) {
      const updated = { ...existing, novelId }
      upsertSession(updated)
      return updated
    }
    return existing
  }
  const created: StoredChatSession = {
    id: sessionId,
    title,
    updatedAt: new Date().toISOString(),
    novelId,
  }
  upsertSession(created)
  return created
}

export function renameSession(sessionId: string, title: string): StoredChatSession | null {
  const existing = listSessions().find((s) => s.id === sessionId)
  if (!existing) return null
  const updated: StoredChatSession = {
    ...existing,
    title: title.trim() || existing.title,
    updatedAt: new Date().toISOString(),
  }
  upsertSession(updated)
  return updated
}

export function deleteSession(sessionId: string): void {
  deleteSessions([sessionId])
}

export function deleteSessions(sessionIds: string[]): void {
  if (typeof localStorage === 'undefined' || sessionIds.length === 0) return
  const drop = new Set(sessionIds)
  const sessions = listSessions().filter((s) => !drop.has(s.id))
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  for (const id of drop) {
    localStorage.removeItem(`${MESSAGES_KEY_PREFIX}${id}`)
  }
}
