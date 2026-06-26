import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 管理端折叠区块：桌面/移动端均可收起，节省纵向空间 */
export function AdminFoldSection({
  title,
  description,
  action,
  defaultOpen = false,
  badge,
  className,
  bodyClassName,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-white shadow-sm', className)}>
      <div className={cn('border-b border-border px-3.5 py-2.5', open && description && 'pb-2')}>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown
              className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
            <span className="truncate text-sm font-semibold">{title}</span>
            {badge ? <span className="shrink-0">{badge}</span> : null}
          </button>
          {action ? (
            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          ) : null}
        </div>
        {open && description ? <p className="mt-1 pl-5 text-xs leading-snug text-muted-foreground">{description}</p> : null}
      </div>
      {open ? <div className={cn('px-3.5 py-3', bodyClassName)}>{children}</div> : null}
    </div>
  )
}
