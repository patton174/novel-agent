const cryptoRef = globalThis.crypto

/** 模块加载时捕获原生实现，避免 polyfill 后误调自身 */
const nativeRandomUUID: (() => string) | null =
  cryptoRef && typeof cryptoRef.randomUUID === 'function'
    ? cryptoRef.randomUUID.bind(cryptoRef)
    : null

function generateRandomUUIDFallback(): string {
  const bytes = new Uint8Array(16)
  if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
    cryptoRef.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** 生成 UUID v4；HTTP 非安全上下文下回退 getRandomValues */
export function randomUUID(): string {
  if (nativeRandomUUID) return nativeRandomUUID()
  return generateRandomUUIDFallback()
}

/** 启动时补丁，避免第三方库直接调 crypto.randomUUID 崩溃 */
export function installRandomUUIDPolyfill(): void {
  if (!cryptoRef || nativeRandomUUID) return
  cryptoRef.randomUUID = generateRandomUUIDFallback
}
