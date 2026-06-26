import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  className?: string
  header?: ReactNode
  footer?: ReactNode
}

export function ProSidebar({
  groups,
  embedded = false,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
  header,
  footer,
}: ProSidebarProps) {
  const narrow = collapsed && !embedded

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-white text-ink transition-[width] duration-200',
        embedded ? 'w-full' : cn('shrink-0 border-r-2 border-black', narrow ? 'w-[4.25rem]' : 'w-56'),
        className,
      )}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <nav className={cn('flex flex-1 flex-col gap-5 overflow-y-auto p-2', narrow && 'px-1.5')}>
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {g.title && !narrow ? (
              <p className="px-2 pb-1.5 pt-0.5 font-mono text-[0.66rem] font-bold uppercase tracking-widest text-primary">
                {g.title}
              </p>
            ) : null}
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={narrow ? item.label : undefined}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center border-2 border-transparent font-mono text-sm font-bold uppercase tracking-wide transition-colors',
                    narrow ? 'justify-center px-0 py-2.5' : 'gap-2.5 py-2.5 pr-3 pl-3',
                    isActive
                      ? 'border-black bg-neon text-ink'
                      : 'text-ink/70 hover:bg-muted hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <IconStroke icon={item.icon} active={isActive} size={20} />
                    {!narrow ? <span className="truncate">{item.label}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {onToggleCollapse && !embedded ? (
        <div className="shrink-0 border-t-2 border-black p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex w-full items-center border-2 border-transparent font-mono text-xs font-bold uppercase tracking-wide text-ink/70 transition-colors hover:border-black/20 hover:bg-muted hover:text-ink',
              narrow ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-2',
            )}
            aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!narrow ? <span>{collapsed ? '展开' : '折叠'}</span> : null}
          </button>
        </div>
      ) : null}
      {footer ? (
        <div className={cn('shrink-0 border-t-2 border-black p-2', narrow && 'px-1.5')}>{footer}</div>
      ) : null}
    </aside>
  )
}
