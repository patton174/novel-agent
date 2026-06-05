export interface RouteEntry {
  method: string
  path: string
}

export interface CryptoManifest {
  version: number
  expiresAtEpochMs: number
  routes: Record<string, RouteEntry>
}

const STORAGE_KEY = 'na_crypto_manifest'

let cached: CryptoManifest | null = null

function readStored(): CryptoManifest | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as CryptoManifest
    if (parsed.expiresAtEpochMs > Date.now()) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function store(manifest: CryptoManifest): void {
  cached = manifest
  sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(manifest))
}

export function isRouteObfuscationEnabled(): boolean {
  return import.meta.env.VITE_ROUTE_OBFUSCATION === 'true' || import.meta.env.VITE_ROUTE_OBFUSCATION === '1'
}

export async function ensureCryptoManifest(force = false): Promise<CryptoManifest | null> {
  if (!isRouteObfuscationEnabled()) {
    return null
  }
  if (!force) {
    cached = cached ?? readStored()
    if (cached && cached.expiresAtEpochMs > Date.now()) {
      const remote = await fetchRemoteManifest()
      if (remote && remote.version > cached.version) {
        store(remote)
        return remote
      }
      return cached
    }
  }
  const manifest = await fetchRemoteManifest()
  if (manifest) {
    store(manifest)
    return manifest
  }
  return cached ?? readStored()
}

async function fetchRemoteManifest(): Promise<CryptoManifest | null> {
  const sources = ['/crypto-manifest.json', '/api/auth/crypto-manifest']
  for (const url of sources) {
    try {
      const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!response.ok) {
        continue
      }
      const manifest = (await response.json()) as CryptoManifest
      if (manifest?.routes && manifest.version) {
        return manifest
      }
    } catch {
      // try next
    }
  }
  return null
}

export function resolveObfuscatedUrl(url: string, method: string, manifest: CryptoManifest | null): string {
  if (!manifest) {
    return url
  }
  const pathOnly = url.split('?')[0] ?? url
  const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
  const upper = method.toUpperCase()

  for (const [token, entry] of Object.entries(manifest.routes)) {
    if (entry.method.toUpperCase() !== upper) {
      continue
    }
    const template = entry.path
    if (template.includes('{')) {
      const prefix = template.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '')
      if (pathOnly === prefix || pathOnly.startsWith(prefix + '/')) {
        const suffix = pathOnly.slice(prefix.length)
        return `/api/x/${token}${suffix}${query}`
      }
      continue
    }
    if (pathOnly === template) {
      return `/api/x/${token}${query}`
    }
  }
  return url
}

export function getManifestVersion(): number | null {
  return cached?.version ?? readStored()?.version ?? null
}
