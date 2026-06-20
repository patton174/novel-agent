import { type ComponentType, type SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { IconStroke } from './IconStroke'
import { cn } from '@/lib/utils'

type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

export interface ProTabBarItem {
  label: string
  to: string
  icon: TablerIcon
  end?: boolean
}

export interface ProTabBarProps {
  items: ProTabBarItem[]
  className?: string
}

export function ProTabBar({ items, className }: ProTabBarProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/60 bg-surface/95 backdrop-blur md:hidden',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[0.68rem] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <IconStroke icon={item.icon} active={isActive} size={22} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
