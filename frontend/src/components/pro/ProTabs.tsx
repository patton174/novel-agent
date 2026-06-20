import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ProTabItem {
  key: string
  label: ReactNode
  content: ReactNode
}

export interface ProTabsProps {
  tabs: ProTabItem[]
  defaultActiveKey?: string
  className?: string
}

export function ProTabs({ tabs, defaultActiveKey, className }: ProTabsProps) {
  const [active, setActive] = useState(defaultActiveKey ?? tabs[0]?.key)
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0]
  return (
    <div className={className}>
      <div role="tablist" className="flex gap-6 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn(
              '-mb-px border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors',
              t.key === active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  )
}
