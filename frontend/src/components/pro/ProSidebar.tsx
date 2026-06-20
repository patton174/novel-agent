import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { IconStroke, type TablerIcon } from './IconStroke'
import { cn } from '@/lib/utils'

export interface ProSidebarItem {
  label: string
  to: string
  icon: TablerIcon
  end?: boolean
}

export interface ProSidebarGroup {
  title?: string
  items: ProSidebarItem[]
}

export interface ProSidebarProps {
  groups: ProSidebarGroup[]
  embedded?: boolean
  onNavigate?: () => void
  className?: string
  /** 顶部插槽（如 wordmark）；embedded=false 时与导航同宽 */
  header?: ReactNode
  /** 底部插槽（如用户头像/设置入口） */
  footer?: ReactNode
}

export function ProSidebar({ groups, embedded = false, onNavigate, className, header, footer }: ProSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-background text-foreground',
        embedded ? 'w-full' : 'w-56 shrink-0 border-r border-border/60',
        className,
      )}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {g.title ? (
              <p className="px-3 pb-1 pt-2 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground/70">{g.title}</p>
            ) : null}
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <IconStroke icon={item.icon} active={isActive} size={20} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {footer ? <div className="shrink-0 border-t border-border/60 p-3">{footer}</div> : null}
    </aside>
  )
}
