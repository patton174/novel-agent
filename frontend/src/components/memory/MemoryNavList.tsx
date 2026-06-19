import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface MemoryNavItem {
  id: string
  label: ReactNode
  trailing?: ReactNode
  disabled?: boolean
}

export interface MemoryNavListProps {
  items: MemoryNavItem[]
  activeId: string
  onChange: (id: string) => void
  'aria-label': string
  /** vertical = admin sidebar; horizontal = mobile sub-menu strip */
  orientation?: 'vertical' | 'horizontal'
}

export function MemoryNavList({
  items,
  activeId,
  onChange,
  'aria-label': ariaLabel,
  orientation = 'vertical',
}: MemoryNavListProps) {
  const vertical = orientation === 'vertical'

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1',
        vertical ? 'flex-col' : 'flex-row overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1',
      )}
    >
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
              vertical ? 'w-full' : 'shrink-0',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              item.disabled && 'pointer-events-none opacity-50',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.trailing ? (
              <span className="shrink-0 text-[10px] font-normal tabular-nums opacity-70">
                {item.trailing}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
