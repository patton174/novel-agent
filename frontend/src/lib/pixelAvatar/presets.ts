import type { PixelAvatarColors, PixelAvatarStyle } from './types'

export interface PixelAvatarPreset {
  id: string
  labelKey: string
  colors: PixelAvatarColors
  styles?: PixelAvatarStyle[]
}

export const PIXEL_AVATAR_PRESETS: PixelAvatarPreset[] = [
  {
    id: 'crimson',
    labelKey: 'editor:avatar.presets.crimson',
    colors: { primary: '#ef4444', accent: '#2563eb', highlight: '#ffffff' },
    styles: ['ghost', 'heart'],
  },
  {
    id: 'mint',
    labelKey: 'editor:avatar.presets.mint',
    colors: { primary: '#34d399', accent: '#0ea5e9', highlight: '#ecfdf5' },
    styles: ['slime', 'kitty'],
  },
  {
    id: 'violet',
    labelKey: 'editor:avatar.presets.violet',
    colors: { primary: '#8b5cf6', accent: '#f472b6', highlight: '#faf5ff' },
    styles: ['star', 'ghost'],
  },
  {
    id: 'amber',
    labelKey: 'editor:avatar.presets.amber',
    colors: { primary: '#f59e0b', accent: '#dc2626', highlight: '#fffbeb' },
    styles: ['bot', 'star'],
  },
  {
    id: 'ocean',
    labelKey: 'editor:avatar.presets.ocean',
    colors: { primary: '#0ea5e9', accent: '#fcc78b', highlight: '#f0f9ff' },
    styles: ['ghost-hungry', 'bot', 'slime'],
  },
  {
    id: 'rose',
    labelKey: 'editor:avatar.presets.rose',
    colors: { primary: '#f43f5e', accent: '#fb7185', highlight: '#fff1f2' },
    styles: ['heart', 'kitty'],
  },
  {
    id: 'graphite',
    labelKey: 'editor:avatar.presets.graphite',
    colors: { primary: '#64748b', accent: '#38bdf8', highlight: '#f8fafc' },
    styles: ['bot', 'ghost'],
  },
  {
    id: 'lime',
    labelKey: 'editor:avatar.presets.lime',
    colors: { primary: '#84cc16', accent: '#eab308', highlight: '#f7fee7' },
    styles: ['slime', 'star'],
  },
  {
    id: 'sakura',
    labelKey: 'editor:avatar.presets.sakura',
    colors: { primary: '#f472b6', accent: '#fda4af', highlight: '#fff1f2' },
    styles: ['heart', 'kitty', 'ghost'],
  },
  {
    id: 'midnight',
    labelKey: 'editor:avatar.presets.midnight',
    colors: { primary: '#312e81', accent: '#818cf8', highlight: '#eef2ff' },
    styles: ['ghost', 'star', 'bot'],
  },
  {
    id: 'ember',
    labelKey: 'editor:avatar.presets.ember',
    colors: { primary: '#ea580c', accent: '#fbbf24', highlight: '#fff7ed' },
    styles: ['ghost-hungry', 'heart'],
  },
  {
    id: 'teal',
    labelKey: 'editor:avatar.presets.teal',
    colors: { primary: '#0d9488', accent: '#5eead4', highlight: '#f0fdfa' },
    styles: ['slime', 'bot'],
  },
  {
    id: 'gold',
    labelKey: 'editor:avatar.presets.gold',
    colors: { primary: '#ca8a04', accent: '#fde047', highlight: '#fefce8' },
    styles: ['star', 'bot'],
  },
  {
    id: 'lavender',
    labelKey: 'editor:avatar.presets.lavender',
    colors: { primary: '#a78bfa', accent: '#c4b5fd', highlight: '#f5f3ff' },
    styles: ['ghost', 'kitty'],
  },
  {
    id: 'coral',
    labelKey: 'editor:avatar.presets.coral',
    colors: { primary: '#fb7185', accent: '#fdba74', highlight: '#fff7ed' },
    styles: ['heart', 'ghost-hungry'],
  },
  {
    id: 'frost',
    labelKey: 'editor:avatar.presets.frost',
    colors: { primary: '#0284c7', accent: '#bae6fd', highlight: '#f0f9ff' },
    styles: ['ghost', 'slime'],
  },
  {
    id: 'neon',
    labelKey: 'editor:avatar.presets.neon',
    colors: { primary: '#06b6d4', accent: '#e879f9', highlight: '#ecfeff' },
    styles: ['star', 'bot'],
  },
  {
    id: 'earth',
    labelKey: 'editor:avatar.presets.earth',
    colors: { primary: '#78716c', accent: '#a8a29e', highlight: '#fafaf9' },
    styles: ['kitty', 'bot'],
  },
  {
    id: 'indigo',
    labelKey: 'editor:avatar.presets.indigo',
    colors: { primary: '#4338ca', accent: '#67e8f9', highlight: '#eef2ff' },
    styles: ['ghost-hungry', 'star'],
  },
  {
    id: 'peach',
    labelKey: 'editor:avatar.presets.peach',
    colors: { primary: '#fb923c', accent: '#fecdd3', highlight: '#fff7ed' },
    styles: ['kitty', 'heart'],
  },
]

export function getPresetById(id: string): PixelAvatarPreset | undefined {
  return PIXEL_AVATAR_PRESETS.find((p) => p.id === id)
}

export function resolvePixelAvatarColors(
  presetId: string,
  customColors: PixelAvatarColors,
): PixelAvatarColors {
  if (presetId === 'custom') return customColors
  return getPresetById(presetId)?.colors ?? customColors
}

export function recommendedPresetsForStyle(style: PixelAvatarStyle): PixelAvatarPreset[] {
  const matched = PIXEL_AVATAR_PRESETS.filter((p) => p.styles?.includes(style))
  return matched.length > 0 ? matched : PIXEL_AVATAR_PRESETS.slice(0, 6)
}

export function sortPresetsForStyle(style: PixelAvatarStyle): PixelAvatarPreset[] {
  const recommended = new Set(recommendedPresetsForStyle(style).map((p) => p.id))
  return [...PIXEL_AVATAR_PRESETS].sort((a, b) => {
    const ar = recommended.has(a.id) ? 0 : 1
    const br = recommended.has(b.id) ? 0 : 1
    return ar - br
  })
}
