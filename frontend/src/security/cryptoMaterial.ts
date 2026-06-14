import { getSessionCrypto } from './sessionStore'
import { ensureCryptoRuntime, getBootstrapCryptoMaterial } from './cryptoRuntime'
import type { SessionCryptoMaterial } from '../types/authSecurity'

export function isBootstrapAuthPath(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return (
    path.startsWith('/api/auth/api/login') ||
    path.startsWith('/api/auth/api/register') ||
    path.startsWith('/api/auth/api/refresh') ||
    path.startsWith('/api/auth/api/captcha') ||
    path.startsWith('/api/auth/api/send-email-code') ||
    path.startsWith('/api/auth/api/confirm-email-verify')
  )
}

async function loadBootstrapMaterial(force = false): Promise<SessionCryptoMaterial | null> {
  await ensureCryptoRuntime(force)
  const material = getBootstrapCryptoMaterial()
  if (material) {
    return material
  }
  if (force) {
    return null
  }
  await ensureCryptoRuntime(true)
  return getBootstrapCryptoMaterial()
}

/** 登录后用 session SK；login/register/refresh 强制 bootstrap，避免旧 session 密钥导致解密失败 */
export async function getActiveCryptoMaterial(logicalUrl?: string): Promise<SessionCryptoMaterial | null> {
  if (logicalUrl && isBootstrapAuthPath(logicalUrl)) {
    return loadBootstrapMaterial(false)
  }

  const session = getSessionCrypto()
  if (session?.aesKeyB64 && session.keyId) {
    return session
  }

  return loadBootstrapMaterial(false)
}
