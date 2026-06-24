import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CONFIGURABLE_MODEL_PRESETS,
  filterModelProviderPresets,
  type ModelProviderPreset,
} from '@/config/modelProviderPresets'
import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import { modelPixelPresetChipClass, MODEL_PIXEL_INPUT } from '@/lib/modelPixelClasses'
import { cn } from '@/lib/utils'

interface ModelProviderPresetPickerProps {
  value: string
  onChange: (preset: ModelProviderPreset) => void
  className?: string
}

export function ModelProviderPresetPicker({
  value,
  onChange,
  className,
}: ModelProviderPresetPickerProps) {
  const { t } = useTranslation(['dashboard'])
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => filterModelProviderPresets(search, CONFIGURABLE_MODEL_PRESETS),
    [search],
  )
  const showSearch = CONFIGURABLE_MODEL_PRESETS.length > 8

  return (
    <div className={cn('space-y-2', className)}>
      {showSearch ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard:model.presetSearchPlaceholder')}
            className={cn(MODEL_PIXEL_INPUT, 'rounded-none py-1.5 pl-8 pr-2 text-xs')}
          />
        </div>
      ) : null}
      <div className="max-h-44 overflow-y-auto border-2 border-foreground/15 p-2 shadow-[inset_1px_1px_0_0_var(--foreground)]">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 font-mono text-[11px] text-muted-foreground">
            {t('dashboard:model.searchEmpty')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((preset) => {
              const selected = value === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.baseUrl || preset.label}
                  onClick={() => onChange(preset)}
                  className={modelPixelPresetChipClass(selected)}
                >
                  <ModelProviderIcon provider={preset.provider} label={preset.label} size="sm" />
                  <span className="max-w-[9rem] truncate">{preset.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
