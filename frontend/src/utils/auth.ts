import { DIRECT_PYTHON } from '../config/runtime'

const TOKEN_KEY = 'novel_agent_token'
const USER_ID_KEY = 'novel_agent_user_id'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function setUserId(userId: string | number): void {
  localStorage.setItem(USER_ID_KEY, String(userId))
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
}

export function isLoggedIn(): boolean {
  if (DIRECT_PYTHON) {
    return true
  }
  return Boolean(getToken())
}

/** 与 Java 网关 sa-token.token-name 一致；本机 PyAI 需 X-User-Id（网关会注入，直连 PyAI 由前端带上） */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers.Authorization = token
  }
  if (!DIRECT_PYTHON) {
    const userId = getUserId()
    if (userId) {
      headers['X-User-Id'] = userId
    }
  }
  return headers
}
