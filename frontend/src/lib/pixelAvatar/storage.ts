import type { PixelAvatarSelection } from './types'
import { DEFAULT_PIXEL_AVATAR, PIXEL_AVATAR_STYLES } from './types'

export const PIXEL_AVATAR_STORAGE_VERSION = 1
export const PIXEL_AVATAR_STORAGE_PREFIX = 'na-pixel-avatar'
export const LEGACY_PIXEL_AVATAR_STORAGE_KEY = 'na-pixel-avatar'

function storageKey(userId: string | null): string {
  const scope = userId?.trim() || 'guest'
  return `${PIXEL_AVATAR_STORAGE_PREFIX}:v${PIXEL_AVATAR_STORAGE_VERSION}:${scope}`
}

function normalizeSelection(raw: Partial<PixelAvatarSelection> | null | undefined): PixelAvatarSelection {
  const style =
    raw?.style && PIXEL_AVATAR_STYLES.includes(raw.style) ? raw.style : DEFAULT_PIXEL_AVATAR.style
  return {
    style,
    presetId: raw?.presetId ?? DEFAULT_PIXEL_AVATAR.presetId,
    customColors: {
      ...DEFAULT_PIXEL_AVATAR.customColors,
      ...raw?.customColors,
    },
  }
}

function readJson(key: string): Partial<PixelAvatarSelection> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Partial<PixelAvatarSelection>
  } catch {
    return null
  }
}

function migrateLegacy(userId: string | null): PixelAvatarSelection | null {
  const legacy = readJson(LEGACY_PIXEL_AVATAR_STORAGE_KEY)
  if (!legacy) return null
  const normalized = normalizeSelection(legacy)
  writeAvatarSelection(userId, normalized)
  try {
    window.localStorage.removeItem(LEGACY_PIXEL_AVATAR_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return normalized
}

export function readAvatarSelection(userId: string | null): PixelAvatarSelection {
  if (typeof window === 'undefined') return DEFAULT_PIXEL_AVATAR
  const stored = readJson(storageKey(userId))
  if (stored) return normalizeSelection(stored)
  const migrated = migrateLegacy(userId)
  if (migrated) return migrated
  return DEFAULT_PIXEL_AVATAR
}

export function writeAvatarSelection(userId: string | null, selection: PixelAvatarSelection): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(userId), JSON.stringify(selection))
}
