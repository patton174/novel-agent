import { getAuthHeaders } from '../utils/auth'
import { ensureCryptoReady } from './sessionBootstrap'
import { ensureCryptoManifest, isRouteObfuscationEnabled, resolveObfuscatedUrl } from './cryptoManifest'
import { wrapFieldPayload, isFieldEncryptionEnabled } from './fieldPayload'
import { getActiveCryptoMaterial } from './cryptoMaterial'
import { ensureCryptoRuntime, invalidateCryptoRuntime, isCryptoStaleError } from './cryptoRuntime'
import {
  encryptRequestBody,
  isSecurityCryptoEnabled,
  isStreamUrl,
} from './requestCrypto'

const ENC_CONTENT_TYPE = 'application/vnd.novel-agent.enc+json'

async function buildRequest(
  logicalUrl: string,
  method: string,
  init?: RequestInit,
): Promise<{ fetchUrl: string; headers: Record<string, string>; body: BodyInit | null | undefined }> {
  const mayNeedCrypto =
    isSecurityCryptoEnabled() &&
    bodyMayEncrypt(method, init?.body)

  if (isSecurityCryptoEnabled()) {
    await ensureCryptoRuntime(false)
    if (isRouteObfuscationEnabled()) {
      await ensureCryptoManifest()
    }
    if (mayNeedCrypto) {
      await ensureCryptoReady()
    }
  }

  let fetchUrl = logicalUrl
  if (isRouteObfuscationEnabled()) {
    const manifest = await ensureCryptoManifest()
    fetchUrl = resolveObfuscatedUrl(logicalUrl, method, manifest)
  }

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  }

  let body = init?.body
  const canEncrypt =
    isSecurityCryptoEnabled() &&
    !(isStreamUrl(logicalUrl) && import.meta.env.VITE_SECURITY_ENCRYPT_STREAM !== 'true') &&
    body != null &&
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)

  const material = canEncrypt ? await getActiveCryptoMaterial() : null

  if (canEncrypt && isFieldEncryptionEnabled() && material) {
    body = await wrapFieldPayload(body as string, material)
  }

  if (canEncrypt && material) {
    const envelope = await encryptRequestBody(body as string, material)
    if (envelope) {
      body = JSON.stringify(envelope)
      headers['Content-Type'] = ENC_CONTENT_TYPE
    } else if (isSecurityCryptoEnabled()) {
      throw new Error('加密密钥缺失，正在热更新…')
    }
  } else if (body != null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  return { fetchUrl, headers, body }
}

export async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const logicalUrl = typeof input === 'string' ? input : input.toString()
  const method = (init?.method ?? 'GET').toUpperCase()

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
    if (isCryptoStaleError(response.status, bodyText)) {
      await invalidateCryptoRuntime()
      response = await exec()
    }
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
  // 异步热更，不阻塞当前响应
  try {
    const remote = Number(headerVersion)
    const local = Number(sessionStorage.getItem('na_crypto_runtime_version') ?? '0')
    return remote > 0 && local > 0 && remote !== local
  } catch {
    return false
  }
}
