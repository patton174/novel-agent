import { Link, useLocation } from 'react-router-dom'
import { IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border/60 px-2', className)}>
      {tabs.map((tab) => {
        const active = pathname === tab.to || pathname.startsWith(tab.to + '/')
        return (
          <div
            key={tab.to}
            className={cn(
              'group flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Link to={tab.to} className="whitespace-nowrap">{tab.label}</Link>
            {onClose ? (
              <button type="button" aria-label={t('a11y.closeTab', { label: tab.label })} onClick={() => onClose(tab.to)} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
                <IconX size={13} stroke={2} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
