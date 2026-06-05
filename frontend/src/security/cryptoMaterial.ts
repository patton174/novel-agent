import { getSessionCrypto } from './sessionStore'
import { ensureCryptoRuntime, getBootstrapCryptoMaterial } from './cryptoRuntime'
import type { SessionCryptoMaterial } from '../types/authSecurity'

/** 登录后用 session SK；登录前或无 session 时用 Worker 注册的 bootstrap */
export async function getActiveCryptoMaterial(): Promise<SessionCryptoMaterial | null> {
  const session = getSessionCrypto()
  if (session?.aesKeyB64 && session.keyId) {
    return session
  }
  await ensureCryptoRuntime(false)
  return getBootstrapCryptoMaterial()
}
