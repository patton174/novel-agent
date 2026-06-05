export interface RouteEntry {
  method: string
  path: string
}

export interface CryptoManifest {
  version: number
  expiresAtEpochMs: number
  routes: Record<string, RouteEntry>
}

export function isRouteObfuscationEnabled(): boolean {
  return import.meta.env.VITE_ROUTE_OBFUSCATION === 'true' || import.meta.env.VITE_ROUTE_OBFUSCATION === '1'
}
