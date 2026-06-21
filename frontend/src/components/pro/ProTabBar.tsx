import { NavLink } from 'react-router-dom'
import { IconStroke, type ProIconType } from './IconStroke'
import { cn } from '@/lib/utils'

export interface ProTabBarItem {
  label: string
  to: string
  icon: ProIconType
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
        'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t-2 border-black bg-white md:hidden',
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
              'flex flex-1 flex-col items-center gap-1 border-r-2 border-black/10 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-wide transition-colors last:border-r-0',
              isActive ? 'bg-neon text-ink' : 'text-ink/70',
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
