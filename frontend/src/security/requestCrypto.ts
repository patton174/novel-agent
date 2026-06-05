export interface RequestCryptoEnvelope {
  v: number
  kid: string
  ts: number
  nonce: string
  iv: string
  ct: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function importAesKey(aesKeyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(aesKeyB64) as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
}

/** iv+ct 合并 base64，与 Java AesGcmCodec.encryptToBase64 对齐 */
async function encryptFieldPartWithKey(plaintext: string, aesKeyB64: string): Promise<string> {
  const key = await importAesKey(aesKeyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bytesToBase64(combined)
}

export async function encryptFieldPart(
  plaintext: string,
  material: { aesKeyB64: string } | null,
): Promise<string> {
  if (!material?.aesKeyB64) {
    throw new Error('session crypto required for field encryption')
  }
  return encryptFieldPartWithKey(plaintext, material.aesKeyB64)
}

export function isSecurityCryptoEnabled(): boolean {
  if (import.meta.env.VITE_SECURITY_BYPASS === 'true' || import.meta.env.VITE_SECURITY_BYPASS === '1') {
    return false
  }
  return import.meta.env.VITE_SECURITY_AES === 'true' || import.meta.env.VITE_SECURITY_AES === '1'
}

export async function encryptRequestBody(
  plaintext: string,
  material: { keyId: string; aesKeyB64: string } | null,
): Promise<RequestCryptoEnvelope | null> {
  if (!material?.aesKeyB64 || !material.keyId) {
    return null
  }
  const key = await importAesKey(material.aesKeyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    v: 1,
    kid: material.keyId,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

export function isCryptoExemptUrl(_url: string): boolean {
  // Phase 0e-b：login/register/refresh 使用 Worker bootstrap AES，不再豁免
  return false
}

export function isStreamUrl(url: string): boolean {
  return url.includes('/agent/chat/stream')
}
