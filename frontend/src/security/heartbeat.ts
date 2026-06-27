import { DIRECT_PYTHON } from '../config/runtime'
import { getAuthHeaders, isLoggedIn } from '../utils/auth'
import { secureFetch } from './secureFetch'
import { getCachedFingerprint, getFingerprint } from './fingerprint'
import { collectEnvDelta } from './envCollect'
import {
  getHeartbeatIntervalSec,
  getSessionId,
} from './sessionStore'

const HIDDEN_INTERVAL_SEC = 180

let timer: ReturnType<typeof setInterval> | null = null
let started = false

async function sendHeartbeat(): Promise<void> {
  if (DIRECT_PYTHON || !isLoggedIn()) {
    return
  }
  const fingerprint = getCachedFingerprint() ?? (await getFingerprint())
  const body = {
    sid: getSessionId(),
    ts: Date.now(),
    fingerprint,
    envDelta: collectEnvDelta(),
  }
  try {
    await secureFetch('/api/auth/auth/heartbeat', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        'X-Fingerprint': fingerprint,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // 心跳失败不打断用户操作；下次 tick 重试
  }
}

function scheduleInterval(): void {
  if (timer != null) {
    clearInterval(timer)
    timer = null
  }
  const visible = document.visibilityState === 'visible'
  const baseSec = getHeartbeatIntervalSec()
  const sec = visible ? baseSec : HIDDEN_INTERVAL_SEC
  timer = setInterval(() => {
    void sendHeartbeat()
  }, sec * 1000)
}

export function startHeartbeatWorker(): () => void {
  if (started || DIRECT_PYTHON) {
    return () => undefined
  }
  started = true

  void sendHeartbeat()
  scheduleInterval()

  const onVisibility = () => scheduleInterval()
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    started = false
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

export function stopHeartbeatWorker(): void {
  if (timer != null) {
    clearInterval(timer)
    timer = null
  }
  started = false
}

/** 页面刷新后恢复心跳；token 续期仅在 API 401 时由 secureFetch 触发 */
export async function ensureSessionAndHeartbeat(): Promise<void> {
  const { startSessionBootstrap } = await import('./sessionBootstrap')
  await startSessionBootstrap()
}
