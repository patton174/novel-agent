import { getAuthHeaders } from '../utils/auth'
import { getSessionCrypto } from './sessionStore'
import { ensureCryptoReady } from './sessionBootstrap'
import { ensureCryptoManifest, isRouteObfuscationEnabled, resolveObfuscatedUrl } from './cryptoManifest'
import { wrapFieldPayload, isFieldEncryptionEnabled } from './fieldPayload'
import {
  encryptRequestBody,
  isCryptoExemptUrl,
  isSecurityCryptoEnabled,
  isStreamUrl,
} from './requestCrypto'

const ENC_CONTENT_TYPE = 'application/vnd.novel-agent.enc+json'

export async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const logicalUrl = typeof input === 'string' ? input : input.toString()
  const method = (init?.method ?? 'GET').toUpperCase()
  const mayNeedCrypto =
    isSecurityCryptoEnabled() &&
    !isCryptoExemptUrl(logicalUrl) &&
    bodyMayEncrypt(method, init?.body)

  if (mayNeedCrypto) {
    await ensureCryptoReady()
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
    !isCryptoExemptUrl(logicalUrl) &&
    !(isStreamUrl(logicalUrl) && import.meta.env.VITE_SECURITY_ENCRYPT_STREAM !== 'true') &&
    body != null &&
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)

  if (canEncrypt && isFieldEncryptionEnabled()) {
    body = await wrapFieldPayload(body as string, getSessionCrypto())
  }

  if (canEncrypt) {
    const envelope = await encryptRequestBody(body as string, getSessionCrypto())
    if (envelope) {
      body = JSON.stringify(envelope)
      headers['Content-Type'] = ENC_CONTENT_TYPE
    } else if (isSecurityCryptoEnabled()) {
      throw new Error('会话加密密钥缺失，请重新登录')
    }
  } else if (body != null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  const target = typeof input === 'string' ? fetchUrl : input instanceof URL ? new URL(fetchUrl) : input
  return fetch(target, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
    body,
  })
}

function bodyMayEncrypt(method: string, body: BodyInit | null | undefined): boolean {
  return body != null && typeof body === 'string' && ['POST', 'PUT', 'PATCH'].includes(method)
}
