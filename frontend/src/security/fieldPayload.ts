import type { SessionCryptoMaterial } from '../types/authSecurity'
import { encryptFieldPart } from './requestCrypto'

export interface FieldSecurePayload {
  __sec: 1
  e: Array<{ k: string; v: string }>
}

export function isFieldEncryptionEnabled(): boolean {
  return import.meta.env.VITE_FIELD_ENCRYPTION === 'true' || import.meta.env.VITE_FIELD_ENCRYPTION === '1'
}

export async function wrapFieldPayload(
  body: string,
  material: SessionCryptoMaterial | null,
): Promise<string> {
  if (!isFieldEncryptionEnabled() || !material?.aesKeyB64) {
    return body
  }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(body) as Record<string, unknown>
  } catch {
    return body
  }
  if (parsed.__sec === 1) {
    return body
  }
  const entries: Array<{ k: string; v: string }> = []
  for (const [key, value] of Object.entries(parsed)) {
    entries.push({
      k: await encryptFieldPart(key, material),
      v: await encryptFieldPart(JSON.stringify(value), material),
    })
  }
  const payload: FieldSecurePayload = { __sec: 1, e: entries }
  return JSON.stringify(payload)
}
