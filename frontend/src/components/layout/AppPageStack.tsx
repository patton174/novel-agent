import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Neo-Brutalist Editorial 共享布局原语（Dashboard / Admin / 全站）。
 * 原则：直角、粗黑边界、硬错位投影、荧光绿(#99FF00)+宝蓝(#1043FF)撞色、
 * 超大 font-black tracking-tighter 标题、mono 功能标记、无渐变无模糊。
 * 详见 design 规范 nvrmnd-editorial-neo-brutalism。
 */

/** 应用内页标准垂直间距；Section 间超大留白 */
export function AppPageStack({
  children,
  className,
  /** 表单窄页（居中 3xl） */
  compact,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-12',
        compact && 'mx-auto max-w-3xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** 内容容器：纯白面 + 2px 黑边 + 硬错位投影，直角 */
export function AppShellCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-2 border-black bg-white shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AppShellCardHeader({
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
        'flex flex-col gap-3 border-b-2 border-black px-6 py-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-black uppercase tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 font-mono text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function AppShellCardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

/**
 * 页面顶部介绍条：超大压迫标题 + mono eyebrow + 行动。
 * 底部粗黑线分割；indigo→宝蓝单点（编号/eyebrow）；无渐变无图标盒。
 */
export function AppPageIntro({
  eyebrow,
  title,
  icon: _icon,
  action,
}: {
  eyebrow: string
  title: ReactNode
  /** 兼容旧调用；粗野主义去图标盒，忽略 */
  icon?: React.ComponentType<{ className?: string }>
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-6 border-b-2 border-black pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          [ {eyebrow} ]
        </span>
        <div className="text-4xl font-black uppercase leading-[0.9] tracking-tighter text-ink md:text-5xl">{title}</div>
      </div>
      {action}
    </header>
  )
}

/** 统计图表统一高度与空态 */
export const APP_CHART_HEIGHT = 'h-60 w-full md:h-72'
export const APP_CHART_EMPTY =
  'flex h-60 items-center justify-center font-mono text-sm text-muted-foreground md:h-72'

/** 图表区块：mono 小节标签 + 黑线分割，无阴影卡片 */
export function AppChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4 border-2 border-black bg-white p-6 shadow-soft', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-black/20 pb-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
          {description ? <p className="mt-1 font-mono text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

/** 列表 / 网格空态：黑边白面卡片，居中排版 */
export function AppEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center shadow-soft', className)}>
      <Icon className="size-8 text-primary" aria-hidden />
      <p className="mt-4 text-xl font-black uppercase tracking-tight text-ink">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm font-mono text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

/**
 * KPI 指标：无图标纯大数字，硬粗野感。
 * 超大 font-black tabular-nums 数值 + mono uppercase 标签 + 顶黑线。
 * icon* 入参兼容旧调用，渲染忽略。
 */
export function AppStatCard({
  label,
  value,
  icon: _icon,
  iconClassName: _iconClassName,
  iconBgClassName: _iconBgClassName,
  loading,
}: {
  label: string
  value: ReactNode
  /** 兼容旧调用；粗野主义无图标 KPI，忽略 */
  icon?: React.ComponentType<{ className?: string }>
  iconClassName?: string
  iconBgClassName?: string
  loading?: boolean
}) {
  return (
    <div className="flex flex-col justify-center gap-3 border-2 border-black bg-white px-5 py-6 shadow-soft">
      <p className="text-[2.5rem] font-black leading-none tabular-nums tracking-tighter text-ink sm:text-[3rem]">
        {loading ? <Skeleton className="h-9 w-16" /> : value}
      </p>
      <p className="truncate font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}
