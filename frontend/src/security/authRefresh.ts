import { clearToken } from '../utils/auth'
import { primeSessionFromLogin } from './sessionBootstrap'
import { startHeartbeatWorker } from './heartbeat'
import { secureFetch } from './secureFetch'
import type { LoginResult } from '../utils/authApi'

/** secureFetch 401 续期用；独立模块避免与 authApi 循环依赖 */
export async function refreshSessionInternal(): Promise<boolean> {
  const response = await secureFetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    clearToken()
    return false
  }
  const data = (await response.json()) as LoginResult
  primeSessionFromLogin(data)
  startHeartbeatWorker()
  return true
}
