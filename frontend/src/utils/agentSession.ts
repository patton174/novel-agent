import { randomUUID } from './randomUUID'

const SESSION_STORAGE_KEY = 'novel-agent-session-id'

/** 同一会话内保持稳定，供后端多轮记忆 */
export function getOrCreateAgentSessionId(): string {
  if (typeof sessionStorage === 'undefined') {
    return `session_${randomUUID()}`
  }
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = `session_${randomUUID()}`
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

export function resetAgentSessionId(): string {
  const id = `session_${randomUUID()}`
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}
