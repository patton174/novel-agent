export interface FingerprintSignals {
  ua: string
  language: string
  languages: string[]
  timezone: string
  screen: { w: number; h: number; colorDepth: number; dpr: number }
  hardwareConcurrency: number
  deviceMemory?: number
  touchSupport: boolean
  canvasHash: string
  webglRenderer: string
}

let cachedFingerprint: string | null = null
let cachedSignals: FingerprintSignals | null = null

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hashCanvas(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return 'no-canvas'
    }
    ctx.textBaseline = 'top'
    ctx.font = '16px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(0, 0, 240, 60)
    ctx.fillStyle = '#069'
    ctx.fillText('novel-agent', 2, 2)
    return canvas.toDataURL()
  } catch {
    return 'canvas-error'
  }
}

function readWebglRenderer(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) {
      return 'no-webgl'
    }
    const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!ext) {
      return 'webgl-no-ext'
    }
    return (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
  } catch {
    return 'webgl-error'
  }
}

export async function collectFingerprintSignals(): Promise<FingerprintSignals> {
  if (cachedSignals) {
    return cachedSignals
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  cachedSignals = {
    ua: nav.userAgent,
    language: nav.language,
    languages: [...(nav.languages ?? [nav.language])],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      w: screen.width,
      h: screen.height,
      colorDepth: screen.colorDepth,
      dpr: window.devicePixelRatio ?? 1,
    },
    hardwareConcurrency: nav.hardwareConcurrency ?? 0,
    deviceMemory: nav.deviceMemory,
    touchSupport: 'ontouchstart' in window || nav.maxTouchPoints > 0,
    canvasHash: hashCanvas(),
    webglRenderer: readWebglRenderer(),
  }
  return cachedSignals
}

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint
  }
  const signals = await collectFingerprintSignals()
  cachedFingerprint = await sha256Hex(stableStringify(signals))
  return cachedFingerprint
}

export function getCachedFingerprint(): string | null {
  return cachedFingerprint
}

export function primeFingerprint(): void {
  void getFingerprint()
}

export function clearFingerprintCache(): void {
  cachedFingerprint = null
  cachedSignals = null
}
