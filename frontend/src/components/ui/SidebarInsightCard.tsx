import type { ReactNode } from 'react'

import { EDITOR_PIXEL_CARD, editorPixelIconSlotClass } from '@/lib/editorPixelClasses'
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
        EDITOR_PIXEL_CARD,
        'flex min-w-0 items-center gap-2 px-2 py-2 transition-colors',
        interactive && 'cursor-pointer hover:bg-neon/20',
        active && 'bg-neon/25',
        className,
      )}
    >
      <div className={editorPixelIconSlotClass()}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[10px] font-bold uppercase tracking-wide text-foreground">
          {title}
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{subtitle}</div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
