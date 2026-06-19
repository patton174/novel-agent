import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SidebarInsightCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  active?: boolean
  trailing?: ReactNode
  className?: string
  'data-testid'?: string
}

/** Sidebar mini card — aligned with KnowledgeGraphMini layout. */
export function SidebarInsightCard({
  icon,
  title,
  subtitle,
  onClick,
  active = false,
  trailing,
  className,
  'data-testid': testId,
}: SidebarInsightCardProps) {
  const interactive = Boolean(onClick)

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-testid={testId}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 transition-colors',
        interactive && 'cursor-pointer hover:bg-muted/40',
        active ? 'border-primary/35 bg-primary/5' : 'border-border/60 bg-muted/25',
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30 text-foreground [&_svg]:size-4">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-medium text-foreground/85">{title}</div>
        <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
