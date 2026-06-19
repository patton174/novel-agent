import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface NavAccordionLeaf {
  id: string
  label: ReactNode
}

export interface NavAccordionItem {
  id: string
  label: ReactNode
  icon?: ReactNode
  trailing?: ReactNode
  leaves?: NavAccordionLeaf[]
}

export interface NavAccordionProps {
  items: NavAccordionItem[]
  expandedId: string | null
  onExpandedChange: (id: string | null) => void
  activeLeafId: string | null
  onLeafSelect: (scopeId: string, leafId: string) => void
  'aria-label': string
  className?: string
}

/** Admin-style collapsible nav: scope → child entries (mobile-friendly). */
export function NavAccordion({
  items,
  expandedId,
  onExpandedChange,
  activeLeafId,
  onLeafSelect,
  'aria-label': ariaLabel,
  className,
}: NavAccordionProps) {
  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-col gap-0.5', className)}>
      {items.map((item) => {
        const expanded = expandedId === item.id
        const leaves = item.leaves ?? []
        const hasLeaves = leaves.length > 0

        return (
          <div key={item.id} className="rounded-lg border border-transparent">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                if (hasLeaves) {
                  if (expanded) {
                    onExpandedChange(null)
                  } else {
                    onExpandedChange(item.id)
                    onLeafSelect(item.id, leaves[0].id)
                  }
                } else {
                  onExpandedChange(item.id)
                  onLeafSelect(item.id, item.id)
                }
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                expanded
                  ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <ChevronRight
                className={cn(
                  'size-3.5 shrink-0 transition-transform duration-200',
                  expanded && 'rotate-90',
                  !hasLeaves && 'opacity-30',
                )}
                aria-hidden
              />
              {item.icon ? <span className="shrink-0 [&_svg]:size-3.5">{item.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.trailing ? (
                <span className="shrink-0 text-[10px] tabular-nums opacity-70">{item.trailing}</span>
              ) : null}
            </button>

            {expanded && hasLeaves ? (
              <ul className="mb-1 ml-3 border-l border-border/60 pl-2">
                {leaves.map((leaf) => {
                  const active = activeLeafId === leaf.id
                  return (
                    <li key={leaf.id}>
                      <button
                        type="button"
                        onClick={() => onLeafSelect(item.id, leaf.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors',
                          active
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{leaf.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
