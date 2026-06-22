export interface TurnstilePublicConfig {
  turnstileEnabled: boolean
  turnstileSiteKey: string
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const DISABLED: TurnstilePublicConfig = { turnstileEnabled: false, turnstileSiteKey: '' }

let cachedConfig: TurnstilePublicConfig | null = null
let configPromise: Promise<TurnstilePublicConfig> | null = null
let scriptPromise: Promise<void> | null = null

function viteTurnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ''
}

function configFromVite(): TurnstilePublicConfig | null {
  const siteKey = viteTurnstileSiteKey()
  if (!siteKey) return null
  return { turnstileEnabled: true, turnstileSiteKey: siteKey }
}

/** 本地优先 .env.local；生产从后端公开接口拉取 site key（构建时 VITE_ 可选兜底）。 */
export async function resolveTurnstileConfig(force = false): Promise<TurnstilePublicConfig> {
  const viteConfig = configFromVite()
  if (viteConfig) {
    cachedConfig = viteConfig
    return viteConfig
  }
  if (!force && cachedConfig) {
    return cachedConfig
  }
  if (!force && configPromise) {
    return configPromise
  }
  configPromise = fetch('/api/auth/api/captcha/config', { method: 'GET', credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) {
        return DISABLED
      }
      const json = (await response.json()) as {
        data?: TurnstilePublicConfig
        turnstileEnabled?: boolean
        turnstileSiteKey?: string
      }
      const payload = json.data ?? json
      const enabled = Boolean(payload.turnstileEnabled)
      const siteKey = (payload.turnstileSiteKey ?? '').trim()
      if (!enabled || !siteKey) {
        return DISABLED
      }
      return { turnstileEnabled: true, turnstileSiteKey: siteKey }
    })
    .catch(() => DISABLED)
    .then((resolved) => {
      cachedConfig = resolved
      return resolved
    })
    .finally(() => {
      configPromise = null
    })
  return configPromise
}

export function resetTurnstileConfigCache(): void {
  cachedConfig = null
  configPromise = null
}

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  if (window.turnstile) {
    return Promise.resolve()
  }
  if (scriptPromise) {
    return scriptPromise
  }
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script failed'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}
