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
  if (!force && runtime && !isExpired(runtime)) {
    return runtime
  }

  // 优先走 Gateway→Auth（与 Redis bootstrap 同步）；静态 json 作兜底
  const sources = ['/api/auth/crypto-config', '/crypto-runtime.json']
  for (const url of sources) {
    try {
      const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!response.ok) {
        continue
      }
      const data = (await response.json()) as CryptoRuntimeConfig
      if (data?.keyId && data?.aesKeyB64) {
        runtime = data
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('na_crypto_runtime_version', String(data.version))
        }
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
  if (!force && runtime && !isExpired(runtime)) {
    return runtime
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
  runtime = null
  await ensureCryptoRuntime(true)
}
