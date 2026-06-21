import { DIRECT_PYTHON } from '../config/runtime'
import { hasAuthSessionHint, migrateLegacyAuthStorage } from '../utils/auth'
import { commitLoginSession } from './loginSession'
import {
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

    // 页面刷新：用 httpOnly refresh cookie 换新 JWT，避免复用过期 sessionStorage token
    if (hasAuthSessionHint()) {
      const { refreshSession } = await import('../utils/authApi')
      await refreshSession()
      return
    }

    // 无本地会话迹象 — 访客，不 silent refresh
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

export function markBootstrapSessionReady(): void {
  bootstrapPromise = Promise.resolve()
}

export function primeSessionFromLogin(data: Parameters<typeof commitLoginSession>[0]): void {
  migrateLegacyAuthStorage()
  commitLoginSession(data)
  markBootstrapSessionReady()
}
