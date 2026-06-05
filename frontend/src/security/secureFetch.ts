import { getAuthHeaders } from '../utils/auth'
import { getSessionCrypto } from './sessionStore'
import {
  encryptRequestBody,
  isCryptoExemptUrl,
  isSecurityCryptoEnabled,
  isStreamUrl,
} from './requestCrypto'

const ENC_CONTENT_TYPE = 'application/vnd.novel-agent.enc+json'

export async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  }

  let body = init?.body
  const method = (init?.method ?? 'GET').toUpperCase()
  const canEncrypt =
    isSecurityCryptoEnabled() &&
    !isCryptoExemptUrl(url) &&
    !(isStreamUrl(url) && import.meta.env.VITE_SECURITY_ENCRYPT_STREAM !== 'true') &&
    body != null &&
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)

  if (canEncrypt) {
    const envelope = await encryptRequestBody(body, getSessionCrypto())
    if (envelope) {
      body = JSON.stringify(envelope)
      headers['Content-Type'] = ENC_CONTENT_TYPE
    }
  } else if (body != null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
    body,
  })
}
