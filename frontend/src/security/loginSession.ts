import type { LoginResult } from '../utils/authApi'
import {
  getAccessToken,
  setAccessToken,
  setHeartbeatIntervalSec,
  setSessionCrypto,
  setSessionId,
  setSessionUserId,
} from './sessionStore'

export function pickAccessToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  const row = data as Record<string, unknown>
  for (const key of ['token', 'accessToken', 'access_token']) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

/** 将 login/refresh 响应写入 session；返回 false 表示响应里没有可用 JWT。 */
export function commitLoginSession(data: LoginResult | Record<string, unknown>): boolean {
  const token = pickAccessToken(data)
  if (!token) {
    return false
  }

  setAccessToken(token)

  const userId = (data as LoginResult).userId
  if (userId != null) {
    setSessionUserId(userId)
  }

  const sessionId = (data as LoginResult).sessionId
  if (sessionId) {
    setSessionId(sessionId)
  }

  const sessionCrypto = (data as LoginResult).sessionCrypto
  if (sessionCrypto) {
    setSessionCrypto({
      keyId: sessionCrypto.keyId,
      aesKeyB64: sessionCrypto.aesKeyB64,
      keyVersion: sessionCrypto.keyVersion,
      expiresAt: sessionCrypto.expiresAtEpochMs ?? sessionCrypto.expiresAt ?? 0,
    })
  }

  const heartbeatIntervalSec = (data as LoginResult).heartbeatIntervalSec
  if (heartbeatIntervalSec) {
    setHeartbeatIntervalSec(heartbeatIntervalSec)
  }

  return getAccessToken() === token
}
