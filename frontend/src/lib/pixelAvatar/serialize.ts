import type { PixelAvatarSelection } from './types'
import { DEFAULT_PIXEL_AVATAR, PIXEL_AVATAR_STYLES } from './types'

export function normalizePixelAvatarSelection(
  raw: Partial<PixelAvatarSelection> | null | undefined,
): PixelAvatarSelection | null {
  if (!raw) return null
  const style =
    raw.style && PIXEL_AVATAR_STYLES.includes(raw.style) ? raw.style : null
  if (!style && !raw.presetId && !raw.customColors) return null
  return {
    style: style ?? DEFAULT_PIXEL_AVATAR.style,
    presetId: raw.presetId ?? DEFAULT_PIXEL_AVATAR.presetId,
    customColors: {
      ...DEFAULT_PIXEL_AVATAR.customColors,
      ...raw.customColors,
    },
  }
}

export function selectionToApiPayload(selection: PixelAvatarSelection) {
  return {
    style: selection.style,
    presetId: selection.presetId,
    customColors: selection.customColors,
  }
}
