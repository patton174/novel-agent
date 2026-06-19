import { DIRECT_PYTHON } from '../config/runtime'
import {
  clearAuthSession,
  getAccessToken,
  getSessionId,
  getSessionUserId,
  hydrateSessionFromStorage,
  setAccessToken,
  setSessionUserId,
} from '../security/sessionStore'
import { commitLoginSession } from '../security/loginSession'
import { getCachedFingerprint } from '../security/fingerprint'

const LEGACY_TOKEN_KEY = 'novel_agent_token'
const LEGACY_USER_ID_KEY = 'novel_agent_user_id'

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const match = document.cookie.match(/(?:^|;\s*)na_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]!) : null
}

/** 迁移：清掉旧版 localStorage token */
export function migrateLegacyAuthStorage(): void {
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(LEGACY_USER_ID_KEY)
}

export function getToken(): string | null {
  return getAccessToken()
}

export function getUserId(): string | null {
  return getSessionUserId()
}

export function setToken(token: string): void {
  setAccessToken(token)
}

export function setUserId(id: string | number): void {
  setSessionUserId(id)
}

export function clearToken(): void {
  clearAuthSession()
}

export function isLoggedIn(): boolean {
  if (DIRECT_PYTHON) {
    return true
  }
  hydrateSessionFromStorage()
  return Boolean(getAccessToken())
}

export function hasAuthSessionHint(): boolean {
  if (DIRECT_PYTHON) {
    return true
  }
  hydrateSessionFromStorage()
  return Boolean(getAccessToken() || getSessionUserId() || getSessionId())
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) {
    headers.Authorization = token
  }
  if (!DIRECT_PYTHON) {
    // userId 不再由前端发送：后端 AuthUserIdInjectFilter 鉴权后从 JWT 注入 X-User-Id，
    // 前端传的会被覆盖，避免伪造。前端仅保留 fingerprint / csrf（非身份标识）。
    const fp = getCachedFingerprint()
    if (fp) {
      headers['X-Fingerprint'] = fp
    }
    const csrf = readCsrfCookie()
    if (csrf) {
      headers['X-CSRF-Token'] = csrf
    }
  }
  return headers
}

export function applyLoginSession(data: {
  token?: string
  userId?: number
  sessionCrypto?: {
    keyId: string
    aesKeyB64: string
    keyVersion: number
    expiresAtEpochMs?: number
    expiresAt?: string | number
  }
  heartbeatIntervalSec?: number
  sessionId?: string
}): void {
  migrateLegacyAuthStorage()
  commitLoginSession(data)
}
