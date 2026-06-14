import { cn } from '@/lib/utils'
import { AppSpinner } from '@/components/loading/AppSpinner'

/** 主包内品牌 Loading，供 guards / layout 第一帧使用 */
export function BrandLoader({
  label = '正在加载',
  className,
  fullScreen = false,
}: {
  label?: string
  className?: string
  fullScreen?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        fullScreen ? 'min-h-screen bg-background' : 'min-h-[40vh]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <p className="text-xl font-semibold tracking-tight text-foreground">
        Novel <span className="text-primary">AI</span>
      </p>
      <InlineBrandLoader label={label} />
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
