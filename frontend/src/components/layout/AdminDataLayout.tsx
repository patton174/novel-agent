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
  return <div className={cn('flex flex-col gap-5', className)}>{children}</div>
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
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(adminPanelPadding, className)}>{children}</div>
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
}

/** KPI 小卡片网格（比概览大屏紧凑，比单行 stat strip 可读） */
export function AdminStatStrip({
  items,
  loading,
  className,
}: {
  items: AdminStatItem[]
  loading?: boolean
  className?: string
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-white px-5 py-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          {loading ? (
            <Skeleton className="mt-2.5 h-7 w-24" />
          ) : (
            <p
              className={cn(
                'mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground',
                item.emphasis && 'text-primary',
              )}
            >
              {item.value}
            </p>
          )}
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
