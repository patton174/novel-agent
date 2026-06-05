import { ensureCryptoRuntime } from './cryptoRuntime'
import { isRouteObfuscationEnabled } from './cryptoManifest'
import { encryptFieldPartWithKey } from './requestCrypto'

function toBase64Url(standardBase64: string): string {
  return standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 动态 API 入口 + 路径 AES/base64url（含 query，不再明文 ?limit=100）。
 * 例：/g/x7k2m9q1/aB3dEf...
 */
export async function buildEncryptedRouteUrl(logicalUrl: string, method: string): Promise<string> {
  if (!isRouteObfuscationEnabled()) {
    return logicalUrl
  }
  const runtime = await ensureCryptoRuntime(false)
  if (!runtime?.apiPathPrefix || !runtime.aesKeyB64) {
    return logicalUrl
  }
  const normalized = logicalUrl.startsWith('/') ? logicalUrl : `/${logicalUrl}`
  const payload = `${method.toUpperCase()}|${normalized}`
  const enc = toBase64Url(await encryptFieldPartWithKey(payload, runtime.aesKeyB64))
  const prefix = runtime.apiPathPrefix.replace(/^\/+/, '')
  return `/${prefix}/${enc}`
}
