import { cn } from '@/lib/utils'

export type AppSpinnerSize = 'sm' | 'md' | 'lg'
export type AppSpinnerVariant = 'ring' | 'brand'

const RING_SIZE: Record<AppSpinnerSize, string> = {
  sm: 'size-3.5 border-[1.5px]',
  md: 'size-4 border-2',
  lg: 'size-5 border-2',
}

const BRAND_DOT: Record<AppSpinnerSize, string> = {
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-3',
}

/** 全站统一 Loading 指示器 — ring（按钮内）/ brand（页面级） */
export function AppSpinner({
  className,
  size = 'md',
  variant = 'ring',
  label,
}: {
  className?: string
  size?: AppSpinnerSize
  variant?: AppSpinnerVariant
  label?: string
}) {
  if (variant === 'brand') {
    const dot = BRAND_DOT[size]
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)} role="status">
        <span className={cn('relative flex shrink-0', dot)}>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className={cn('relative inline-flex rounded-full bg-primary', dot)} />
        </span>
        {label ? <span>{label}</span> : null}
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-primary/25 border-t-primary',
        RING_SIZE[size],
        className,
      )}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
