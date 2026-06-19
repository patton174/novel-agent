import { clearToken } from '../utils/auth'
import { markBootstrapSessionReady } from './sessionBootstrap'
import { commitLoginSession } from './loginSession'
import { startHeartbeatWorker } from './heartbeat'
import { secureFetch } from './secureFetch'
import type { LoginResult } from '../utils/authApi'
import { parseResultResponse } from '../utils/resultApi'

let refreshPromise: Promise<boolean> | null = null

/** secureFetch 401 续期用；独立模块避免与 authApi 循环依赖 */
export async function refreshSessionInternal(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
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
    clearToken()
    return false
  }
  const data = await parseResultResponse<LoginResult>(response)
  if (!commitLoginSession(data)) {
    clearToken()
    return false
  }
  markBootstrapSessionReady()
  startHeartbeatWorker()
  return true
}
