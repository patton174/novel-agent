import { useMemo, useState } from 'react'
import { Check, ChevronDown, Flame, Gauge, Loader2, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAvailableModels } from '@/hooks/useAvailableModels'
import { cn } from '@/lib/utils'
import type { ModelTierId } from '@/config/modelTiers'
import {
  buildTierModelOptions,
  filterModelOptions,
  findTierModelOption,
  type ModelOption,
} from '@/utils/modelSelection'
import {
  MODEL_PIXEL_DROPDOWN,
  MODEL_PIXEL_TRIGGER,
  modelPixelChipClass,
  modelPixelPickerRowClass,
} from '@/lib/modelPixelClasses'

interface ModelSelectorProps {
  value?: string | null
  onChange: (value: string | null) => void
  type?: string
  compact?: boolean
  disabled?: boolean
  className?: string
  showSessionBadge?: boolean
  forSettings?: boolean
}

function TierGlyph({ tierId, className }: { tierId?: ModelTierId; className?: string }) {
  const iconClass = cn('size-3.5 shrink-0', className)
  if (tierId === 'light') return <Zap className={iconClass} />
  if (tierId === 'balanced') return <Gauge className={iconClass} />
  if (tierId === 'extreme') return <Flame className={iconClass} />
  return <Gauge className={iconClass} />
}

function ModelPickerRow({
  option,
  selected,
  onSelect,
}: {
  option: ModelOption
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation(['dashboard'])

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={modelPixelPickerRowClass(selected)}
    >
      {option.kind === 'auto' ? (
        <Sparkles className="size-3.5 shrink-0 text-primary" />
      ) : option.kind === 'tier' ? (
        <TierGlyph tierId={option.tierId} className="text-primary" />
      ) : (
        <Gauge className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-mono text-xs font-bold text-foreground">{option.label}</span>
          {option.kind === 'default' ? (
            <span className={cn(modelPixelChipClass(false), 'shrink-0 py-px text-[9px] normal-case')}>
              {t('dashboard:model.defaultShort')}
            </span>
          ) : null}
        </span>
        {option.subtitle ? (
          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
            {option.subtitle}
          </span>
        ) : null}
      </span>
      {selected ? (
        <Check className="size-3.5 shrink-0 text-foreground" strokeWidth={3} />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
    </button>
  )
}

export function ModelSelector({
  value,
  onChange,
  type = 'llm',
  compact = false,
  disabled = false,
  className,
  showSessionBadge = false,
  forSettings = false,
}: ModelSelectorProps) {
  const { t } = useTranslation(['dashboard', 'editor'])
  const { data, loading, failed, empty } = useAvailableModels(type)
  const [open, setOpen] = useState(false)

  const labels = useMemo(
    () => ({
      autoLabel: t('dashboard:model.autoLabel'),
      autoSubtitle: t('dashboard:model.autoSubtitle'),
      defaultLabel: t('dashboard:model.defaultFollowSettings'),
      defaultSubtitle: t('dashboard:model.defaultFollowSettingsSubtitle'),
      tierSubtitle: t('dashboard:model.tierPickerHint'),
      tierLabels: {
        light: t('dashboard:model.tierLight'),
        balanced: t('dashboard:model.tierBalanced'),
        extreme: t('dashboard:model.tierExtreme'),
      } as Record<ModelTierId, string>,
      tierRanges: {
        light: t('dashboard:model.tierLightRange'),
        balanced: t('dashboard:model.tierBalancedRange'),
        extreme: t('dashboard:model.tierExtremeRange'),
      } as Record<ModelTierId, string>,
    }),
    [t],
  )

  const current = findTierModelOption(value, data, labels, {
    includeAccountDefault: !forSettings,
  })
  const options = buildTierModelOptions(data, labels, {
    includeAccountDefault: !forSettings,
  })
  const filtered = filterModelOptions(options, '')

  const selectedValue = value ?? ''
  const isSessionOverride = showSessionBadge && value != null && value !== ''

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || loading}>
        <button
          type="button"
          data-testid="model-selector-trigger"
          aria-label={t('editor:chat.modelLabel')}
          title={failed ? t('editor:chat.modelLoadFailed') : t('editor:chat.modelLabel')}
          className={cn(
            MODEL_PIXEL_TRIGGER,
            compact
              ? 'h-8 max-w-[11rem] px-1.5 text-[11px] normal-case'
              : 'h-9 min-w-[12rem] max-w-full px-2 text-sm normal-case',
            className,
          )}
        >
          {loading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : current.kind === 'auto' ? (
            <Sparkles className="size-3.5 shrink-0 text-primary" />
          ) : current.kind === 'tier' ? (
            <TierGlyph tierId={current.tierId} className="text-primary" />
          ) : (
            <Gauge className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-left normal-case">
            {loading ? t('editor:chat.modelLoading') : current.label}
          </span>
          {isSessionOverride ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 border border-black bg-neon"
              title={t('dashboard:model.sessionOverride')}
            />
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn(MODEL_PIXEL_DROPDOWN, 'w-[min(20rem,calc(100vw-2rem))]')}
      >
        {failed ? (
          <p className="px-2 py-2 font-mono text-[11px] text-destructive">
            {t('editor:chat.modelLoadFailed')}
          </p>
        ) : null}
        {empty && !loading && !failed ? (
          <p className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
            {t('editor:chat.modelEmpty')}
          </p>
        ) : null}

        {filtered.map((option) => (
          <ModelPickerRow
            key={option.value || '__default__'}
            option={option}
            selected={selectedValue === option.value}
            onSelect={() => {
              onChange(option.value === '' ? null : option.value)
              setOpen(false)
            }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
