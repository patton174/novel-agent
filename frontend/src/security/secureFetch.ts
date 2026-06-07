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
const TRACE_HEADER = 'X-Trace-Id'

function newTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

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
    [TRACE_HEADER]: newTraceId(),
    ...(init?.headers as Record<string, string> | undefined),
  }

  let body = init?.body
  let signEmbeddedInBody = false

  // 本地 dev 将 /api/agent 直连 PyAI 时无 Gateway 解密层，禁止对 agent 请求做 body AES
  const agentBypassesGateway =
    import.meta.env.DEV &&
    Boolean(import.meta.env.VITE_LOCAL_PYAI) &&
    logicalUrl.includes('/api/agent/')

  const canEncryptBody =
    isSecurityCryptoEnabled() &&
    !agentBypassesGateway &&
    !(isStreamUrl(logicalUrl) && import.meta.env.VITE_SECURITY_ENCRYPT_STREAM !== 'true') &&
    body != null &&
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)

  const material = canEncryptBody || isSecurityCryptoEnabled()
    ? await getActiveCryptoMaterial(logicalUrl)
    : null

  // SSE stream 走扁平 JSON，避免 __sec 字段体在网关未展开时导致 message 校验失败
  if (canEncryptBody && isFieldEncryptionEnabled() && material && !isStreamUrl(logicalUrl)) {
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

type SecureFetchInit = RequestInit & {
  __authRetried?: boolean
  /** 防重放 nonce 冲突后仅重试一次 */
  __signRetried?: boolean
}

export async function secureFetch(input: RequestInfo | URL, init?: SecureFetchInit): Promise<Response> {
  const logicalUrl = typeof input === 'string' ? input : input.toString()
  const method = (init?.method ?? 'GET').toUpperCase()
  const retried = Boolean(init?.__authRetried)
  const signRetried = Boolean(init?.__signRetried)

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
    for (let cryptoRetried = 0; cryptoRetried < 2; cryptoRetried += 1) {
      const bodyText = await response.clone().text().catch(() => '')
      const cryptoStaleHeader = response.headers.get('X-Crypto-Stale') === '1'
      const cryptoStale =
        cryptoStaleHeader ||
        isCryptoStaleError(response.status, bodyText) ||
        bodyText.includes('invalid sign') ||
        bodyText.includes('sign required')
      if (!cryptoStale) {
        break
      }
      if (isBootstrapAuthPath(logicalUrl)) {
        setSessionCrypto(null)
      }
      await invalidateCryptoRuntime()
      response = await exec()
      if (response.ok) {
        break
      }
    }

    const bodyText = await response.clone().text().catch(() => '')
    if (
      response.status === 400 &&
      !signRetried &&
      (bodyText.includes('REPLAY_NONCE') || bodyText.includes('REPLAY_WINDOW'))
    ) {
      response = await secureFetch(input, { ...init, __signRetried: true })
    }
  }

  if (response.status === 401 && !isAuthSelfPath(logicalUrl)) {
    if (!retried) {
      const ok = await tryRefreshSessionOnce()
      if (ok) {
        return secureFetch(input, { ...init, __authRetried: true })
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
