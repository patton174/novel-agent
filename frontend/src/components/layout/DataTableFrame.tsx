import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('common')
  return (
    <div className={cn('relative', className)}>
      {scrollHint ? (
        <p className="px-4 pb-2 text-center text-[10px] font-medium text-muted-foreground md:hidden">
          {t('table.scrollHint')}
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
