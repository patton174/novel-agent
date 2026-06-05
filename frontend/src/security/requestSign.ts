import type { SessionCryptoMaterial } from '../types/authSecurity'

/** GET/PUT/DELETE 等：签名参数挂在 URL query，不用 X-Novel-Agent-* 头 */
export const SIGN_Q_TS = '_na_t'
export const SIGN_Q_NONCE = '_na_n'
export const SIGN_Q_KID = '_na_k'
export const SIGN_Q_SIGN = '_na_s'

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSign(canonical: string, aesKeyB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(aesKeyB64) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(canonical),
  )
  return bytesToBase64Url(new Uint8Array(sig))
}

/** METHOD|/api/path?query|ts|nonce|sha256(body) */
export async function computeRequestSign(
  method: string,
  logicalUrl: string,
  bodyBytes: Uint8Array,
  material: SessionCryptoMaterial,
  opts: { ts: number; nonce: string },
): Promise<string> {
  const path = logicalUrl.startsWith('/') ? logicalUrl : `/${logicalUrl}`
  const bodyHash = await sha256Hex(bodyBytes)
  const canonical = `${method.toUpperCase()}|${path}|${opts.ts}|${opts.nonce}|${bodyHash}`
  return hmacSign(canonical, material.aesKeyB64)
}

/** GET/PUT/PATCH/DELETE：签名 query 参数 */
export async function buildSignQueryParams(
  method: string,
  logicalUrl: string,
  bodyBytes: Uint8Array,
  material: SessionCryptoMaterial,
  opts?: { ts?: number; nonce?: string },
): Promise<Record<string, string>> {
  const ts = opts?.ts ?? Date.now()
  const nonce = opts?.nonce ?? crypto.randomUUID()
  const sign = await computeRequestSign(method, logicalUrl, bodyBytes, material, { ts, nonce })
  return {
    [SIGN_Q_TS]: String(ts),
    [SIGN_Q_NONCE]: nonce,
    [SIGN_Q_KID]: material.keyId,
    [SIGN_Q_SIGN]: sign,
  }
}

export function appendSignQuery(url: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString()
  if (!qs) {
    return url
  }
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`
}
