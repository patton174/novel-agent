import { cn } from '@/lib/utils'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { BRAND_NAME } from '@/lib/brand'
import { useTranslation } from 'react-i18next'

/** 主包内品牌 Loading，供 guards / layout 第一帧使用 */
export function BrandLoader({
  label,
  className,
  fullScreen = false,
}: {
  label?: string
  className?: string
  fullScreen?: boolean
}) {
  const { t } = useTranslation(['common'])
  const displayLabel = label ?? t('feedback.loadingDefault')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        fullScreen ? 'min-h-screen bg-background' : 'min-h-[40vh]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={displayLabel}
    >
      <p className="text-xl font-semibold tracking-tight text-foreground">
        {BRAND_NAME.split(' ')[0]} <span className="text-primary">{BRAND_NAME.split(' ').slice(1).join(' ')}</span>
      </p>
      <InlineBrandLoader label={displayLabel} />
    </div>
  )
}

export function InlineBrandLoader({
  label,
  className,
  size = 'sm',
}: {
  label?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <AppSpinner
      variant="brand"
      size={size === 'md' ? 'md' : 'sm'}
      label={label}
      className={className}
    />
  )
}
