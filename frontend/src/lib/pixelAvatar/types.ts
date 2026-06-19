export const PIXEL_AVATAR_STYLES = ['ghost', 'ghost-hungry', 'bot', 'slime', 'star', 'heart', 'kitty'] as const

export type PixelAvatarStyle = (typeof PIXEL_AVATAR_STYLES)[number]

export interface PixelAvatarColors {
  primary: string
  accent: string
  highlight: string
}

export interface PixelAvatarSelection {
  style: PixelAvatarStyle
  presetId: string
  customColors: PixelAvatarColors
}

export const DEFAULT_PIXEL_AVATAR: PixelAvatarSelection = {
  style: 'ghost',
  presetId: 'crimson',
  customColors: {
    primary: '#ef4444',
    accent: '#2563eb',
    highlight: '#ffffff',
  },
}
