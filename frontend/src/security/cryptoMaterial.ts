import { getSessionCrypto } from './sessionStore'
import { ensureCryptoRuntime, getBootstrapCryptoMaterial } from './cryptoRuntime'
import type { SessionCryptoMaterial } from '../types/authSecurity'

export function isBootstrapAuthPath(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/captcha') ||
    path.startsWith('/api/auth/send-email-code')
  )
}

/** 登录后用 session SK；login/register/refresh 强制 bootstrap，避免旧 session 密钥导致解密失败 */
export async function getActiveCryptoMaterial(logicalUrl?: string): Promise<SessionCryptoMaterial | null> {
  if (!logicalUrl || !isBootstrapAuthPath(logicalUrl)) {
    const session = getSessionCrypto()
    if (session?.aesKeyB64 && session.keyId) {
      return session
    }
  }
  await ensureCryptoRuntime(false)
  return getBootstrapCryptoMaterial()
}
