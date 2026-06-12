import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 管理台表格：横向滚动 + 统一边框 */
export function DataTableFrame({
  children,
  className,
  embedded,
  scrollHint = true,
}: {
  children: ReactNode
  className?: string
  /** 嵌套在 AppShellCard 内时去掉外边框 */
  embedded?: boolean
  /** 移动端横滑提示 */
  scrollHint?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      {scrollHint ? (
        <p className="px-4 pb-2 text-center text-[10px] font-medium text-muted-foreground md:hidden">
          ← 左右滑动查看完整表格 →
        </p>
      ) : null}
      <div
        className={cn(
          'overflow-x-auto',
          embedded ? 'border-t border-border/60' : 'rounded-xl border border-border bg-surface',
        )}
      >
        {children}
      </div>
    </div>
  )
}
