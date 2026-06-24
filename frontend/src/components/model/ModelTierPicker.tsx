import { useTranslation } from 'react-i18next'
import { MODEL_TIERS, type ModelTierId } from '@/config/modelTiers'
import { MODEL_PIXEL_LABEL, modelPixelPlanChipClass } from '@/lib/modelPixelClasses'
import { cn } from '@/lib/utils'

interface ModelTierPickerProps {
  value: ModelTierId
  onChange: (tierId: ModelTierId) => void
  className?: string
}

export function ModelTierPicker({ value, onChange, className }: ModelTierPickerProps) {
  const { t } = useTranslation(['dashboard'])

  return (
    <div className={cn('grid gap-1.5', className)}>
      <span className={MODEL_PIXEL_LABEL}>{t('dashboard:model.tierLabel')}</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODEL_TIERS.map((tier) => {
          const selected = value === tier.id
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={cn(
                modelPixelPlanChipClass(selected),
                'flex min-h-[4.5rem] flex-col items-start gap-0.5 px-2 py-2 text-left normal-case',
              )}
            >
              <span className="font-bold">{t(`dashboard:model.${tier.labelKey}`)}</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {t(`dashboard:model.${tier.rangeLabelKey}`)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ×{tier.defaultMultiplier}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
