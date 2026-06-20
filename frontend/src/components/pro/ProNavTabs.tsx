import { Link, useLocation } from 'react-router-dom'
import { IconX } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface NavTabItem {
  to: string
  label: string
}

export interface ProNavTabsProps {
  tabs: NavTabItem[]
  onClose?: (to: string) => void
  className?: string
}

export function ProNavTabs({ tabs, onClose, className }: ProNavTabsProps) {
  const { pathname } = useLocation()
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border/60 px-2', className)}>
      {tabs.map((t) => {
        const active = pathname === t.to
        return (
          <div
            key={t.to}
            className={cn(
              'group flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Link to={t.to} className="whitespace-nowrap">{t.label}</Link>
            {onClose ? (
              <button type="button" aria-label={`关闭 ${t.label}`} onClick={() => onClose(t.to)} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                <IconX size={13} stroke={2} />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
