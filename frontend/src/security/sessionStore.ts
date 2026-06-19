import type { SessionCryptoMaterial } from '../types/authSecurity'

const CRYPTO_STORAGE_KEY = 'na_session_crypto'
const TOKEN_STORAGE_KEY = 'na_access_token'
const SESSION_ID_STORAGE_KEY = 'na_session_id'
const USER_ID_STORAGE_KEY = 'na_user_id'

let accessToken: string | null = null
let userId: string | null = null
let sessionCrypto: SessionCryptoMaterial | null = null
let heartbeatIntervalSec = 60
let sessionId: string | null = null

function persistJson(key: string, value: unknown | null): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  if (value == null) {
    sessionStorage.removeItem(key)
    return
  }
  sessionStorage.setItem(key, JSON.stringify(value))
}

function readJson<T>(key: string): T | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  const raw = sessionStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 页面刷新后同步恢复 token / sessionCrypto，避免首包 POST 明文 */
export function hydrateSessionFromStorage(): void {
  if (!accessToken) {
    const storedToken = sessionStorage?.getItem(TOKEN_STORAGE_KEY)
    if (storedToken) {
      accessToken = storedToken
    }
  }
  if (!sessionId) {
    const storedSid = sessionStorage?.getItem(SESSION_ID_STORAGE_KEY)
    if (storedSid) {
      sessionId = storedSid
    }
  }
  if (!sessionCrypto) {
    sessionCrypto = readJson<SessionCryptoMaterial>(CRYPTO_STORAGE_KEY)
  }
  if (!userId) {
    const storedUserId = sessionStorage?.getItem(USER_ID_STORAGE_KEY)
    if (storedUserId) {
      userId = storedUserId
    }
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) {
    sessionStorage?.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    sessionStorage?.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function getAccessToken(): string | null {
  // sessionStorage 为跨 chunk/HMR 的权威来源；内存 token 可能滞后于 refresh 写入。
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored !== accessToken) {
      accessToken = stored
    }
    return stored
  }
  return accessToken
}

export function isLoggedIn(): boolean {
  hydrateSessionFromStorage()
  return Boolean(getAccessToken())
}

export function setSessionUserId(id: string | number | null): void {
  userId = id == null ? null : String(id)
  if (userId) {
    sessionStorage?.setItem(USER_ID_STORAGE_KEY, userId)
  } else {
    sessionStorage?.removeItem(USER_ID_STORAGE_KEY)
  }
}

export function getSessionUserId(): string | null {
  return userId
}

export function setSessionCrypto(crypto: SessionCryptoMaterial | null): void {
  sessionCrypto = crypto
  persistJson(CRYPTO_STORAGE_KEY, crypto)
}

export function getSessionCrypto(): SessionCryptoMaterial | null {
  if (!sessionCrypto) {
    hydrateSessionFromStorage()
  }
  return sessionCrypto
}

export function setSessionId(id: string | null): void {
  sessionId = id
  if (id) {
    sessionStorage?.setItem(SESSION_ID_STORAGE_KEY, id)
  } else {
    sessionStorage?.removeItem(SESSION_ID_STORAGE_KEY)
  }
}

export function getSessionId(): string | null {
  return sessionId
}

export function setHeartbeatIntervalSec(sec: number): void {
  heartbeatIntervalSec = sec > 0 ? sec : 60
}

export function getHeartbeatIntervalSec(): number {
  return heartbeatIntervalSec
}

export function clearAuthSession(): void {
  accessToken = null
  userId = null
  sessionCrypto = null
  sessionId = null
  sessionStorage?.removeItem(CRYPTO_STORAGE_KEY)
  sessionStorage?.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage?.removeItem(SESSION_ID_STORAGE_KEY)
  sessionStorage?.removeItem(USER_ID_STORAGE_KEY)
}

if (typeof sessionStorage !== 'undefined') {
  hydrateSessionFromStorage()
}
