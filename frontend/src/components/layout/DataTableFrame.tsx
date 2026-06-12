import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 管理台表格：横向滚动 + 统一边框 */
export function DataTableFrame({
  children,
  className,
  embedded,
}: {
  children: ReactNode
  className?: string
  /** 嵌套在 AppShellCard 内时去掉外边框 */
  embedded?: boolean
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto',
        embedded ? 'border-t border-border/60' : 'rounded-xl border border-border bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}
