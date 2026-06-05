import { ensureCryptoRuntime } from './cryptoRuntime'
import { isRouteObfuscationEnabled } from './cryptoManifest'
import { encryptFieldPartWithKey } from './requestCrypto'

function toBase64Url(standardBase64: string): string {
  return standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 动态 API 入口 + 路径 AES/base64url，不依赖后端下发的路由映射表。
 * 例：/g/x7k2m9q1/aB3dEf...?limit=100
 */
export async function buildEncryptedRouteUrl(logicalUrl: string, method: string): Promise<string> {
  if (!isRouteObfuscationEnabled()) {
    return logicalUrl
  }
  const runtime = await ensureCryptoRuntime(false)
  if (!runtime?.apiPathPrefix || !runtime.aesKeyB64) {
    return logicalUrl
  }
  const qIdx = logicalUrl.indexOf('?')
  const pathOnly = qIdx >= 0 ? logicalUrl.slice(0, qIdx) : logicalUrl
  const query = qIdx >= 0 ? logicalUrl.slice(qIdx) : ''
  const payload = `${method.toUpperCase()}|${pathOnly}`
  const enc = toBase64Url(await encryptFieldPartWithKey(payload, runtime.aesKeyB64))
  const prefix = runtime.apiPathPrefix.replace(/^\/+/, '')
  return `/${prefix}/${enc}${query}`
}
