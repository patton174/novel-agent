import { applyLoginSession, clearToken, getAuthHeaders } from './auth'
import { secureFetch } from '../security/secureFetch'
import { collectFullEnv } from '../security/envCollect'
import { getFingerprint } from '../security/fingerprint'
import { startHeartbeatWorker, stopHeartbeatWorker } from '../security/heartbeat'
import { primeSessionFromLogin } from '../security/sessionBootstrap'

export interface LoginResult {
  token: string
  username: string
  role: string
  expiresIn: number
  userId?: number
  sessionCrypto?: {
    keyId: string
    aesKeyB64: string
    keyVersion: number
    expiresAtEpochMs?: number
  }
  heartbeatIntervalSec?: number
  sessionId?: string
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body?.message) {
      return String(body.message)
    }
  } catch {
    // ignore
  }
  return `请求失败 (${response.status})`
}

async function syncUserIdFromServer(): Promise<void> {
  const response = await secureFetch('/api/auth/info', {
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    return
  }
  const data = (await response.json()) as { userId?: number; username?: string }
  if (data.userId != null) {
    applyLoginSession({ userId: data.userId })
  } else if (data.username) {
    applyLoginSession({ userId: Number(data.username) || undefined })
  }
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const [fingerprint, envSnapshot] = await Promise.all([
    getFingerprint(),
    Promise.resolve(collectFullEnv()),
  ])
  const response = await secureFetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Fingerprint': fingerprint,
    },
    body: JSON.stringify({ username, password, fingerprint, envSnapshot }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as LoginResult
  primeSessionFromLogin(data)
  if (data.userId == null) {
    await syncUserIdFromServer()
  }
  startHeartbeatWorker()
  return data
}

export async function register(
  username: string,
  password: string,
  email: string,
): Promise<void> {
  const response = await secureFetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function logout(): Promise<void> {
  try {
    await secureFetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    })
  } finally {
    stopHeartbeatWorker()
    clearToken()
  }
}

export async function refreshSession(): Promise<boolean> {
  const response = await secureFetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    clearToken()
    return false
  }
  const data = (await response.json()) as LoginResult
  primeSessionFromLogin(data)
  startHeartbeatWorker()
  return true
}
