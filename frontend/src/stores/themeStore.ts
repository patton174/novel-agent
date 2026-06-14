import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'na-theme'
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

let detachSystemListener: (() => void) | null = null

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme')
    if (isThemeMode(fromUrl)) {
      return fromUrl
    }
  } catch {
    /* ignore */
  }
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(raw) ? raw : 'system'
}

function resolveDarkMode(theme: ThemeMode): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia(DARK_MEDIA_QUERY).matches
}

function writeTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function toggleDarkClass(enabled: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', enabled)
}

function bindSystemThemeListener() {
  if (typeof window === 'undefined') return
  if (detachSystemListener) {
    detachSystemListener()
    detachSystemListener = null
  }

  const media = window.matchMedia(DARK_MEDIA_QUERY)
  const onSystemThemeChange = () => {
    if (useThemeStore.getState().theme === 'system') {
      toggleDarkClass(resolveDarkMode('system'))
    }
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onSystemThemeChange)
    detachSystemListener = () => media.removeEventListener('change', onSystemThemeChange)
    return
  }

  media.addListener(onSystemThemeChange)
  detachSystemListener = () => media.removeListener(onSystemThemeChange)
}

export function applyTheme(theme: ThemeMode) {
  toggleDarkClass(resolveDarkMode(theme))
}

export function initializeTheme() {
  applyTheme(useThemeStore.getState().theme)
  bindSystemThemeListener()
}

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    writeTheme(theme)
    set({ theme })
    applyTheme(theme)
  },
}))
