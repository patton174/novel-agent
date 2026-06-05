export interface ClientEnvSnapshot {
  ua: string
  platform: string
  languages: string[]
  timezone: string
  screen: { w: number; h: number; dpr: number }
  connection?: { effectiveType?: string }
  cookieEnabled: boolean
  webdriver: boolean
  pluginsCount: number
  touchSupport: boolean
  clientVersion: string
}

export interface ClientEnvDelta {
  visibility?: DocumentVisibilityState
  online?: boolean
}

export function collectFullEnv(): ClientEnvSnapshot {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } }
  return {
    ua: nav.userAgent,
    platform: nav.platform,
    languages: [...(nav.languages ?? [nav.language])],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      w: screen.width,
      h: screen.height,
      dpr: window.devicePixelRatio ?? 1,
    },
    connection: nav.connection?.effectiveType
      ? { effectiveType: nav.connection.effectiveType }
      : undefined,
    cookieEnabled: nav.cookieEnabled,
    webdriver: Boolean((nav as Navigator & { webdriver?: boolean }).webdriver),
    pluginsCount: nav.plugins?.length ?? 0,
    touchSupport: 'ontouchstart' in window || nav.maxTouchPoints > 0,
    clientVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  }
}

export function collectEnvDelta(): ClientEnvDelta {
  return {
    visibility: document.visibilityState,
    online: navigator.onLine,
  }
}
