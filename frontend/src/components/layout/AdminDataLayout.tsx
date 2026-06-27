import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { adminPanelPadding, adminToolbarClass } from '@/components/admin/adminUiTokens'

/** 管理后台列表/统计页标准间距（概览大屏不用） */
export function AdminDataPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('flex flex-col gap-3', className)}>{children}</div>
}

export function AdminDataPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-white shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminDataPanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/20',
        adminPanelPadding,
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function AdminDataPanelBody({
  children,
  className,
  flush,
}: {
  children: ReactNode
  className?: string
  /** 表格等内容贴边，避免与面板双边框 */
  flush?: boolean
}) {
  return <div className={cn(flush ? 'overflow-hidden' : adminPanelPadding, className)}>{children}</div>
}

/** 筛选条 */
export function AdminDataToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(adminToolbarClass, className)}>{children}</div>
}

export type AdminStatItem = {
  label: string
  value: ReactNode
  emphasis?: boolean
  /** 次要说明（如订阅分布摘要） */
  hint?: string
}

/** KPI 单行统计条：4–8 项等分一行，窄屏横向滚动 */
export function AdminStatStrip({
  items,
  loading,
  className,
}: {
  items: AdminStatItem[]
  loading?: boolean
  className?: string
}) {
  const colCount = Math.min(Math.max(items.length, 1), 8)

  return (
    <div
      className={cn(
        'grid gap-3 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(7.25rem, 1fr))` }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3"
        >
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{item.label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-6 w-20 sm:mt-2 sm:h-7" />
          ) : (
            <p
              className={cn(
                'mt-1 truncate text-lg font-semibold tabular-nums tracking-tight text-foreground sm:mt-1.5 sm:text-xl',
                item.emphasis && 'text-primary',
              )}
            >
              {item.value}
            </p>
          )}
          {item.hint && !loading ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]" title={item.hint}>
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** @deprecated 使用 AdminStatStrip */
export const AdminDenseStatStrip = AdminStatStrip

/** @deprecated 使用 AdminField from AdminFormControls */
export function AdminFilterField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('grid min-w-[140px] flex-1 gap-2 sm:max-w-xs', className)}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

