import { DIRECT_PYTHON } from '../config/runtime'
import { clearToken } from '../utils/auth'
import { stopHeartbeatWorker } from './heartbeat'

const AUTH_SELF_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/captcha',
  '/api/auth/send-email-code',
]

let redirecting = false

export function isAuthSelfPath(url: string): boolean {
  const path = (url.split('?')[0] ?? url).trim()
  return AUTH_SELF_PREFIXES.some((prefix) => path.startsWith(prefix))
}

export function forceLogoutRedirect(reason?: string): void {
  if (DIRECT_PYTHON || redirecting) {
    return
  }
  if (typeof window === 'undefined') {
    return
  }
  const onAuthPage = /^\/(login|register)(\/|$)/.test(window.location.pathname)
  if (onAuthPage) {
    return
  }
  redirecting = true
  stopHeartbeatWorker()
  clearToken()
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  window.location.replace(`/login${query}`)
}
