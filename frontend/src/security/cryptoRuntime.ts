import type { SessionCryptoMaterial } from '../types/authSecurity'

export interface CryptoRuntimeConfig {
  keyId: string
  aesKeyB64: string
  version: number
  expiresAtEpochMs: number
  /** 动态 API 入口前缀，如 g/x7k2m9q1（每日 Worker 注册轮换） */
  apiPathPrefix?: string
  registeredBy?: string
}

let runtime: CryptoRuntimeConfig | null = null
let loadPromise: Promise<CryptoRuntimeConfig | null> | null = null

const REFRESH_MARGIN_MS = 60 * 60 * 1000
const RUNTIME_STORAGE_KEY = 'na_crypto_runtime'

function loadRuntimeFromStorage(): CryptoRuntimeConfig | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const raw = sessionStorage.getItem(RUNTIME_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const data = JSON.parse(raw) as CryptoRuntimeConfig
    if (data?.keyId && data?.aesKeyB64 && !isExpired(data)) {
      return data
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null
}

function persistRuntime(cfg: CryptoRuntimeConfig): void {
  runtime = cfg
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(cfg))
    sessionStorage.setItem('na_crypto_runtime_version', String(cfg.version))
  } catch {
    /* ignore quota */
  }
}

function clearRuntimeCache(): void {
  runtime = null
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(RUNTIME_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function isExpired(cfg: CryptoRuntimeConfig | null): boolean {
  if (!cfg) {
    return true
  }
  return cfg.expiresAtEpochMs <= Date.now() + REFRESH_MARGIN_MS
}

function toMaterial(cfg: CryptoRuntimeConfig | null): SessionCryptoMaterial | null {
  if (!cfg?.aesKeyB64 || !cfg.keyId) {
    return null
  }
  return {
    keyId: cfg.keyId,
    aesKeyB64: cfg.aesKeyB64,
    keyVersion: cfg.version,
    expiresAt: cfg.expiresAtEpochMs,
  }
}

async function fetchRuntime(force: boolean): Promise<CryptoRuntimeConfig | null> {
  // 本地 bypass / 未启用加密时不需要 crypto runtime，跳过请求避免
  // /api/auth/crypto-config 404 噪音（后端无 runtime 注册时返回 404）。
  const bypass = import.meta.env.VITE_SECURITY_BYPASS === 'true'
    || import.meta.env.VITE_SECURITY_BYPASS === '1'
  const aesOn = import.meta.env.VITE_SECURITY_AES === 'true'
    || import.meta.env.VITE_SECURITY_AES === '1'
  if (bypass || !aesOn) {
    return null
  }
  if (!force && runtime && !isExpired(runtime)) {
    return runtime
  }

  if (!force && !runtime) {
    const stored = loadRuntimeFromStorage()
    if (stored) {
      runtime = stored
      return runtime
    }
  }

  // 主路径：Worker nginx 静态文件（不经 Gateway 验签）；失败再兜底 Auth API
  const cacheBust = force ? `?v=${Date.now()}` : ''
  const sources = [`/crypto-runtime.json${cacheBust}`, '/api/auth/crypto-config']
  for (const url of sources) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        cache: force ? 'no-store' : 'default',
      })
      if (!response.ok) {
        continue
      }
      const data = (await response.json()) as CryptoRuntimeConfig
      if (data?.keyId && data?.aesKeyB64) {
        persistRuntime(data)
        return runtime
      }
    } catch {
      // try next source
    }
  }
  return runtime
}

/** Worker 每日注册后写入的 bootstrap 密钥；浏览器启动/失效时热更新 */
export async function ensureCryptoRuntime(force = false): Promise<CryptoRuntimeConfig | null> {
  if (!force) {
    if (runtime && !isExpired(runtime)) {
      return runtime
    }
    const stored = loadRuntimeFromStorage()
    if (stored) {
      runtime = stored
      return runtime
    }
  }
  if (!loadPromise) {
    loadPromise = fetchRuntime(force).finally(() => {
      loadPromise = null
    })
  }
  return loadPromise
}

export function getBootstrapCryptoMaterial(): SessionCryptoMaterial | null {
  if (isExpired(runtime)) {
    return null
  }
  return toMaterial(runtime)
}

export function isCryptoStaleError(status: number, bodyText: string): boolean {
  if (status !== 400 && status !== 401 && status !== 404 && status !== 500) {
    return false
  }
  const t = bodyText.toLowerCase()
  return (
    t.includes('unknown key') ||
    t.includes('decrypt') ||
    t.includes('aes envelope') ||
    t.includes('key_stale') ||
    t.includes('cryptostale') ||
    t.includes('route prefix') ||
    t.includes('invalid route') ||
    t.includes('route cipher') ||
    t.includes('bootstrap runtime') ||
    t.includes('crypto')
  )
}

export async function invalidateCryptoRuntime(): Promise<void> {
  clearRuntimeCache()
  await ensureCryptoRuntime(true)
}
