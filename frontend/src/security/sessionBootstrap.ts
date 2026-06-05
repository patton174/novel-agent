import { DIRECT_PYTHON } from '../config/runtime'
import { applyLoginSession } from '../utils/auth'
import {
  getAccessToken,
  getSessionCrypto,
  hydrateSessionFromStorage,
} from './sessionStore'
import { ensureCryptoRuntime } from './cryptoRuntime'

let bootstrapPromise: Promise<void> | null = null

async function runBootstrap(): Promise<void> {
  if (DIRECT_PYTHON) {
    return
  }

  hydrateSessionFromStorage()

  if (getAccessToken() && getSessionCrypto()) {
    return
  }

  await ensureCryptoRuntime(false)

  if (!getAccessToken()) {
    const { refreshSession } = await import('../utils/authApi')
    const ok = await refreshSession()
    if (ok && getSessionCrypto()) {
      return
    }
  }

  // 有 token 但缺 sessionCrypto（旧会话）：再拉一次 refresh 补密钥
  if (getAccessToken() && !getSessionCrypto()) {
    const { refreshSession } = await import('../utils/authApi')
    await refreshSession()
  }
}

/** 应用启动时调用一次；secureFetch 也会 await，避免刷新后首包明文 */
export function startSessionBootstrap(): Promise<void> {
  if (DIRECT_PYTHON) {
    return Promise.resolve()
  }
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch(() => {
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

export async function ensureCryptoReady(): Promise<void> {
  await startSessionBootstrap()
}

export function primeSessionFromLogin(data: Parameters<typeof applyLoginSession>[0]): void {
  applyLoginSession(data)
  bootstrapPromise = Promise.resolve()
}
