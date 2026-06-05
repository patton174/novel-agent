import { getAuthHeaders } from '../utils/auth'
import { ensureCryptoReady } from './sessionBootstrap'
import { isRouteObfuscationEnabled } from './cryptoManifest'
import { buildEncryptedRouteUrl } from './routePathCrypto'
import { wrapFieldPayload, isFieldEncryptionEnabled } from './fieldPayload'
import { getActiveCryptoMaterial, isBootstrapAuthPath } from './cryptoMaterial'
import { setSessionCrypto } from './sessionStore'
import { ensureCryptoRuntime, invalidateCryptoRuntime, isCryptoStaleError } from './cryptoRuntime'
import { buildSignQueryParams, appendSignQuery, computeRequestSign } from './requestSign'
import { forceLogoutRedirect, isAuthSelfPath } from './authSession'
import {
  encryptRequestBody,
  isSecurityCryptoEnabled,
  isStreamUrl,
} from './requestCrypto'

const ENC_CONTENT_TYPE = 'application/vnd.novel-agent.enc+json'

function bodyBytesOf(body: BodyInit | null | undefined): Uint8Array {
  if (body == null) {
    return new Uint8Array()
  }
  if (typeof body === 'string') {
    return new TextEncoder().encode(body)
  }
  return new Uint8Array()
}

async function buildRequest(
  logicalUrl: string,
  method: string,
  init?: RequestInit,
): Promise<{ fetchUrl: string; headers: Record<string, string>; body: BodyInit | null | undefined }> {
  const mayNeedCrypto =
    isSecurityCryptoEnabled() &&
    (bodyMayEncrypt(method, init?.body) || method === 'GET' || method === 'DELETE' || method === 'HEAD')

  if (isSecurityCryptoEnabled()) {
    await ensureCryptoRuntime(false)
    if (mayNeedCrypto) {
      await ensureCryptoReady()
    }
  }

  let fetchUrl = logicalUrl
  if (isRouteObfuscationEnabled()) {
    fetchUrl = await buildEncryptedRouteUrl(logicalUrl, method)
  }

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  }

  let body = init?.body
  let signEmbeddedInBody = false

  const canEncryptBody =
    isSecurityCryptoEnabled() &&
    !(isStreamUrl(logicalUrl) && import.meta.env.VITE_SECURITY_ENCRYPT_STREAM !== 'true') &&
    body != null &&
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)

  const material = canEncryptBody || isSecurityCryptoEnabled()
    ? await getActiveCryptoMaterial(logicalUrl)
    : null

  if (canEncryptBody && isFieldEncryptionEnabled() && material) {
    body = await wrapFieldPayload(body as string, material)
  }

  if (canEncryptBody && material) {
    const envelope = await encryptRequestBody(body as string, material)
    if (envelope) {
      const unsignedJson = JSON.stringify(envelope)
      const sign = await computeRequestSign(
        method,
        logicalUrl,
        new TextEncoder().encode(unsignedJson),
        material,
        { ts: envelope.ts, nonce: envelope.nonce },
      )
      body = JSON.stringify({ ...envelope, sign })
      headers['Content-Type'] = ENC_CONTENT_TYPE
      signEmbeddedInBody = true
    } else if (isSecurityCryptoEnabled()) {
      throw new Error('加密密钥缺失，正在热更新…')
    }
  } else if (body != null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (isSecurityCryptoEnabled() && material && !signEmbeddedInBody) {
    const signParams = await buildSignQueryParams(
      method,
      logicalUrl,
      bodyBytesOf(body),
      material,
    )
    fetchUrl = appendSignQuery(fetchUrl, signParams)
  }

  return { fetchUrl, headers, body }
}

async function tryRefreshSessionOnce(): Promise<boolean> {
  try {
    const { refreshSessionInternal } = await import('./authRefresh')
    return await refreshSessionInternal()
  } catch {
    return false
  }
}

async function handleUnauthorized(logicalUrl: string, retried: boolean): Promise<void> {
  if (isAuthSelfPath(logicalUrl)) {
    return
  }
  if (!retried) {
    const ok = await tryRefreshSessionOnce()
    if (ok) {
      return
    }
  }
  forceLogoutRedirect('session_expired')
}

export async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const logicalUrl = typeof input === 'string' ? input : input.toString()
  const method = (init?.method ?? 'GET').toUpperCase()
  const retried = Boolean((init as RequestInit & { __authRetried?: boolean } | undefined)?.__authRetried)

  const exec = async () => {
    const { fetchUrl, headers, body } = await buildRequest(logicalUrl, method, init)
    const target =
      typeof input === 'string' ? fetchUrl : input instanceof URL ? new URL(fetchUrl) : input
    return fetch(target, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
      body,
    })
  }

  let response = await exec()

  if (response.status >= 400 && isSecurityCryptoEnabled()) {
    const bodyText = await response.clone().text().catch(() => '')
    if (isCryptoStaleError(response.status, bodyText) || bodyText.includes('invalid sign') || bodyText.includes('sign required')) {
      if (isBootstrapAuthPath(logicalUrl)) {
        setSessionCrypto(null)
      }
      await invalidateCryptoRuntime()
      response = await exec()
    }
  }

  if (response.status === 401 && !isAuthSelfPath(logicalUrl)) {
    if (!retried) {
      const ok = await tryRefreshSessionOnce()
      if (ok) {
        return secureFetch(input, { ...init, __authRetried: true } as RequestInit)
      }
    }
    await handleUnauthorized(logicalUrl, retried)
  }

  const ver = response.headers.get('X-Crypto-Key-Version')
  if (ver && runtimeVersionMismatch(ver)) {
    void invalidateCryptoRuntime()
  }

  return response
}

function bodyMayEncrypt(method: string, body: BodyInit | null | undefined): boolean {
  return body != null && typeof body === 'string' && ['POST', 'PUT', 'PATCH'].includes(method)
}

function runtimeVersionMismatch(headerVersion: string): boolean {
  try {
    const remote = Number(headerVersion)
    const local = Number(sessionStorage.getItem('na_crypto_runtime_version') ?? '0')
    return remote > 0 && local > 0 && remote !== local
  } catch {
    return false
  }
}
