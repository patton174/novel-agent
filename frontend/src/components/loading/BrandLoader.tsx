import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'
import { cn } from '@/lib/utils'

interface BrandLoaderProps {
  label?: string
  className?: string
  compact?: boolean
}

export function BrandLoader({ label = '正在加载', className, compact = false }: BrandLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        compact ? 'py-10' : 'min-h-[40vh]',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <NovelAiWordmark size={compact ? 'sm' : 'md'} animate />
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <span>{label}</span>
      </div>
    </div>
  )
}
