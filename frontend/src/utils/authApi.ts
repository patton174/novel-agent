import { useUserStore } from '../stores/userStore'

import { clearToken, getAuthHeaders } from './auth'

import { secureFetch } from '../security/secureFetch'

import { collectFullEnv } from '../security/envCollect'

import { getFingerprint } from '../security/fingerprint'

import { startHeartbeatWorker, stopHeartbeatWorker } from '../security/heartbeat'

import { primeSessionFromLogin } from '../security/sessionBootstrap'

import { parseResultResponse, readApiErrorMessage, unwrapResult } from './resultApi'
import { ensureCryptoRuntime } from '../security/cryptoRuntime'



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



export async function login(username: string, password: string): Promise<LoginResult> {
  await ensureCryptoRuntime(true)

  const [fingerprint, envSnapshot] = await Promise.all([

    getFingerprint(),

    Promise.resolve(collectFullEnv()),

  ])

  const response = await secureFetch('/api/auth/api/login', {

    method: 'POST',

    credentials: 'include',

    headers: {

      'Content-Type': 'application/json',

      'X-Fingerprint': fingerprint,

    },

    body: JSON.stringify({ username, password, fingerprint, envSnapshot }),

  })



  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const data = await parseResultResponse<LoginResult>(response)

  primeSessionFromLogin(data)

  startHeartbeatWorker()

  return data

}



export async function refreshSession(): Promise<boolean> {

  const { refreshSessionInternal } = await import('../security/authRefresh')

  return refreshSessionInternal()

}



/** @deprecated 请用 authRefresh.refreshSessionInternal */

export async function refreshSessionInternal(): Promise<boolean> {

  const { refreshSessionInternal: refresh } = await import('../security/authRefresh')

  return refresh()

}



export async function verifyTurnstile(email: string, turnstileToken: string): Promise<string> {
  await ensureCryptoRuntime(true)

  const response = await secureFetch('/api/auth/api/captcha/turnstile/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, turnstileToken, website: '' }),
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const data = await parseResultResponse<{ captchaToken: string }>(response)
  return data.captchaToken
}



export async function sendEmailCode(

  email: string,

  captchaToken: string,

  fingerprint: string,

): Promise<void> {
  await ensureCryptoRuntime(true)

  const response = await secureFetch('/api/auth/api/send-email-code', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      'X-Fingerprint': fingerprint,

    },

    body: JSON.stringify({ email, captchaToken, fingerprint }),

  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const json = await response.json()

  unwrapResult<null>(json, response.status)
}

export async function register(

  username: string,

  password: string,

  email: string,

  emailCode: string,

): Promise<void> {
  await ensureCryptoRuntime(true)

  const response = await secureFetch('/api/auth/api/register', {

    method: 'POST',

    credentials: 'include',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({ username, password, email, emailCode }),

  })



  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const json = await response.json()

  unwrapResult<null>(json, response.status)
}



export async function logout(): Promise<void> {

  try {

    await secureFetch('/api/auth/api/logout', {

      method: 'POST',

      credentials: 'include',

      headers: { ...getAuthHeaders() },

    })

  } finally {

    stopHeartbeatWorker()

    clearToken()

    useUserStore.getState().clear()

  }

}


