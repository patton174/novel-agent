import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Refined inset rule between orchestration and delivery body. */
export function TimelineBodyDivider({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-hidden
      className={cn('my-3 flex w-full items-center gap-3 max-md:my-2.5', className)}
      data-testid="orchestration-body-divider"
      {...props}
    >
      <span className="h-px min-w-[12px] flex-1 rounded-full bg-gradient-to-r from-transparent to-border/80" />
      <span className="size-1 shrink-0 rounded-full bg-border/90 ring-2 ring-background" />
      <span className="h-px min-w-[12px] flex-1 rounded-full bg-gradient-to-l from-transparent to-border/80" />
    </div>
  )
}
