import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PixelAvatar } from '@/components/avatars/PixelAvatar'
import { PIXEL_AVATAR_REGISTRY } from '@/lib/pixelAvatar/registry'
import {
  recommendedPresetsForStyle,
  resolvePixelAvatarColors,
  sortPresetsForStyle,
} from '@/lib/pixelAvatar/presets'
import type { PixelAvatarColors, PixelAvatarStyle } from '@/lib/pixelAvatar/types'
import { usePixelAvatarStore } from '@/stores/pixelAvatarStore'
import { cn } from '@/lib/utils'

const COLOR_KEYS: Array<{ key: keyof PixelAvatarColors; labelKey: string }> = [
  { key: 'primary', labelKey: 'editor:avatar.colors.primary' },
  { key: 'accent', labelKey: 'editor:avatar.colors.accent' },
  { key: 'highlight', labelKey: 'editor:avatar.colors.highlight' },
]

export function PixelAvatarPicker({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation(['editor'])
  const style = usePixelAvatarStore((s) => s.style)
  const presetId = usePixelAvatarStore((s) => s.presetId)
  const customColors = usePixelAvatarStore((s) => s.customColors)
  const setStyle = usePixelAvatarStore((s) => s.setStyle)
  const setPresetId = usePixelAvatarStore((s) => s.setPresetId)
  const setCustomColors = usePixelAvatarStore((s) => s.setCustomColors)

  const colors = useMemo(
    () => resolvePixelAvatarColors(presetId, customColors),
    [presetId, customColors],
  )

  const sortedPresets = useMemo(() => sortPresetsForStyle(style), [style])
  const recommendedIds = useMemo(
    () => new Set(recommendedPresetsForStyle(style).map((p) => p.id)),
    [style],
  )

  function previewColorsFor(itemStyle: PixelAvatarStyle) {
    if (presetId === 'custom') return colors
    const preset = recommendedPresetsForStyle(itemStyle)[0]?.id ?? presetId
    return resolvePixelAvatarColors(preset, customColors)
  }

  return (
    <section className="space-y-4" data-testid="pixel-avatar-picker">
      {!embedded ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('editor:avatar.sectionTitle')}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t('editor:avatar.sectionDesc')}</p>
        </div>
      ) : null}

      <div className="flex justify-center rounded-xl border border-border/60 bg-muted/20 py-5">
        <PixelAvatar style={style} colors={colors} size={80} animated />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-foreground">{t('editor:avatar.styleLabel')}</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {PIXEL_AVATAR_REGISTRY.map((item) => {
            const active = item.style === style
            return (
              <button
                key={item.style}
                type="button"
                aria-pressed={active}
                title={t(item.labelKey)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/25'
                    : 'border-border/60 bg-background hover:bg-muted/40',
                )}
                onClick={() => setStyle(item.style as PixelAvatarStyle)}
              >
                <PixelAvatar
                  style={item.style}
                  colors={previewColorsFor(item.style)}
                  size={32}
                  animated={false}
                />
                <span className="max-w-full truncate text-[9px] leading-none text-muted-foreground">
                  {t(item.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-foreground">{t('editor:avatar.presetsLabel')}</p>
        <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3">
          {sortedPresets.map((preset) => {
            const active = presetId === preset.id
            const isRecommended = recommendedIds.has(preset.id)
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                title={t(preset.labelKey)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/60 bg-background hover:bg-muted/40',
                )}
                onClick={() => setPresetId(preset.id)}
              >
                <span className="flex shrink-0 gap-0.5">
                  <span className="size-3 rounded-sm" style={{ background: preset.colors.primary }} />
                  <span className="size-3 rounded-sm" style={{ background: preset.colors.accent }} />
                  <span
                    className="size-3 rounded-sm ring-1 ring-border/40"
                    style={{ background: preset.colors.highlight }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground">
                  {t(preset.labelKey)}
                </span>
                {isRecommended ? (
                  <span className="shrink-0 text-[8px] uppercase tracking-wide text-primary/80">
                    {t('editor:avatar.recommendedBadge')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
        <p className="text-[11px] font-medium text-foreground">{t('editor:avatar.customLabel')}</p>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_KEYS.map(({ key, labelKey }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">{t(labelKey)}</span>
              <input
                type="color"
                value={colors[key]}
                className="h-8 w-full cursor-pointer rounded-md border border-border/60 bg-background p-0.5"
                onChange={(e) => setCustomColors({ [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {presetId === 'custom' ? (
          <p className="text-[10px] text-muted-foreground">{t('editor:avatar.customActive')}</p>
        ) : null}
      </div>
    </section>
  )
}
