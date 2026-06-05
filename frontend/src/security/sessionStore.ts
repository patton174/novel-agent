import type { SessionCryptoMaterial } from '../types/authSecurity'

let accessToken: string | null = null
let userId: string | null = null
let sessionCrypto: SessionCryptoMaterial | null = null
let heartbeatIntervalSec = 60
let sessionId: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setSessionUserId(id: string | number | null): void {
  userId = id == null ? null : String(id)
}

export function getSessionUserId(): string | null {
  return userId
}

export function setSessionCrypto(crypto: SessionCryptoMaterial | null): void {
  sessionCrypto = crypto
}

export function getSessionCrypto(): SessionCryptoMaterial | null {
  return sessionCrypto
}

export function setSessionId(id: string | null): void {
  sessionId = id
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
}
