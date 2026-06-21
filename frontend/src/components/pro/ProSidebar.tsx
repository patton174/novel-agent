import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { IconStroke, type ProIconType } from './IconStroke'
import { cn } from '@/lib/utils'

export interface ProSidebarItem {
  label: string
  to: string
  icon: ProIconType
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
        'flex h-full flex-col bg-white text-ink',
        embedded ? 'w-full' : 'w-56 shrink-0 border-r-2 border-black',
        className,
      )}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {g.title ? (
              <p className="px-2 pb-2 pt-1 font-mono text-[0.66rem] font-bold uppercase tracking-widest text-primary">{g.title}</p>
            ) : null}
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-2.5 border-2 border-transparent py-2.5 pr-3 pl-3 font-mono text-sm font-bold uppercase tracking-wide transition-colors',
                    isActive
                      ? 'border-black bg-neon text-ink'
                      : 'text-ink/70 hover:bg-muted hover:text-ink',
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
      {footer ? <div className="shrink-0 border-t-2 border-black p-3">{footer}</div> : null}
    </aside>
  )
}
