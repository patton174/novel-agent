import { clearToken } from '../utils/auth'
import { markBootstrapSessionReady } from './sessionBootstrap'
import { commitLoginSession } from './loginSession'
import { startHeartbeatWorker } from './heartbeat'
import { secureFetch } from './secureFetch'
import type { LoginResult } from '../utils/authApi'
import { parseResultResponse } from '../utils/resultApi'

let refreshPromise: Promise<boolean> | null = null
/** 续期失败后短窗口内不再重试，避免并发 401 风暴 */
let refreshFailedAt = 0
const REFRESH_FAILURE_COOLDOWN_MS = 5000

/** secureFetch 401 续期用；独立模块避免与 authApi 循环依赖 */
export async function refreshSessionInternal(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }
  if (refreshFailedAt > 0 && Date.now() - refreshFailedAt < REFRESH_FAILURE_COOLDOWN_MS) {
    return false
  }
  refreshPromise = doRefreshSession()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function doRefreshSession(): Promise<boolean> {
  const response = await secureFetch('/api/auth/api/refresh', {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    refreshFailedAt = Date.now()
    clearToken()
    return false
  }
  const data = await parseResultResponse<LoginResult>(response)
  if (!commitLoginSession(data)) {
    refreshFailedAt = Date.now()
    clearToken()
    return false
  }
  refreshFailedAt = 0
  markBootstrapSessionReady()
  startHeartbeatWorker()
  return true
}
