import { DIRECT_PYTHON } from '../config/runtime'
import { applyLoginSession } from '../utils/auth'
import {
  getAccessToken,
  getSessionCrypto,
  hydrateSessionFromStorage,
} from './sessionStore'
import { ensureCryptoRuntime } from './cryptoRuntime'

let bootstrapPromise: Promise<void> | null = null
let bootstrapRunning = false

async function runBootstrap(): Promise<void> {
  if (DIRECT_PYTHON) {
    return
  }

  bootstrapRunning = true
  try {
    hydrateSessionFromStorage()

    // 部署会轮换 apiPathPrefix；已登录用户也必须拉最新 runtime，否则 /g/ 路由 404
    await ensureCryptoRuntime(true)

    if (getAccessToken() && getSessionCrypto()) {
      return
    }

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
  } finally {
    bootstrapRunning = false
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
  // refresh 等 bootstrap 内请求只需 runtime 密钥，不能 await 自身 bootstrapPromise
  if (bootstrapRunning) {
    await ensureCryptoRuntime(true)
    return
  }
  await startSessionBootstrap()
}

export function primeSessionFromLogin(data: Parameters<typeof applyLoginSession>[0]): void {
  applyLoginSession(data)
  bootstrapPromise = Promise.resolve()
}
