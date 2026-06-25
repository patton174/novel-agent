import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { tierForMultiplier, isValidTierMultiplier, clampTierMultiplier } from '@/config/modelTiers'
import { MODEL_PIXEL_INPUT, MODEL_PIXEL_LABEL, modelPixelChipClass } from '@/lib/modelPixelClasses'
import { cn } from '@/lib/utils'

interface ModelMultiplierFieldProps {
  value: string
  onChange: (next: string) => void
  className?: string
}

const pixelInput = `${MODEL_PIXEL_INPUT} rounded-none`

export function ModelMultiplierField({ value, onChange, className }: ModelMultiplierFieldProps) {
  const { t } = useTranslation(['dashboard', 'admin'])
  const numeric = Number(value)
  const valid = isValidTierMultiplier(numeric)
  const tier = valid ? tierForMultiplier(numeric) : null

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label className={MODEL_PIXEL_LABEL}>{t('admin:model.formMultiplier')}</label>
      <Input
        type="number"
        min={1}
        max={3}
        step={0.05}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value.trim()) {
            onChange('1.25')
            return
          }
          onChange(String(clampTierMultiplier(numeric)))
        }}
        className={pixelInput}
      />
      <p className="font-mono text-[10px] text-muted-foreground">{t('dashboard:model.multiplierHint')}</p>
      {tier ? (
        <span className={cn(modelPixelChipClass(true), 'w-fit normal-case')}>
          {t('dashboard:model.tierAutoClass')}: {t(`dashboard:model.${tier.labelKey}`)} (
          {t(`dashboard:model.${tier.rangeLabelKey}`)})
        </span>
      ) : (
        <span className="font-mono text-[10px] text-destructive">{t('dashboard:model.multiplierInvalid')}</span>
      )}
    </div>
  )
}
