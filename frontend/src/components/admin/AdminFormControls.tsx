import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import type { ComponentProps } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  TableActionButton,
  TableActionIconButton,
} from '@/components/shared/TableActions'
import {
  adminNoticeClass,
  adminPanelPadding,
  adminToolbarClass,
} from './adminUiTokens'

/** 管理台表单字段：标签 + 控件 + 可选说明 */
export function AdminField({
  label,
  hint,
  children,
  className,
  layout = 'toolbar',
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
  /** toolbar：筛选条；form：弹窗/配置表单 */
  layout?: 'toolbar' | 'form'
}) {
  const isForm = layout === 'form'
  return (
    <div
      className={cn(
        'grid min-w-[140px] flex-1 gap-2',
        isForm ? 'sm:max-w-none' : 'sm:max-w-xs',
        className,
      )}
    >
      <span
        className={cn(
          'font-medium text-foreground',
          isForm ? 'text-sm' : 'text-xs',
        )}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

const adminControlClass =
  'h-9 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

/** 管理台下拉框（原生 select + 右侧 chevron） */
export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(adminControlClass, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

/** 管理台搜索框 */
export function AdminSearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input className={cn(adminControlClass, 'pl-9', className)} {...props} />
    </div>
  )
}

/** 管理台文本输入（与 Select 同高同圆角） */
export function AdminTextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={cn(adminControlClass, className)} {...props} />
}

type AdminButtonProps = ComponentProps<typeof Button>

/** 主操作按钮（保存、创建等） */
export function AdminButton({ className, size = 'lg', ...props }: AdminButtonProps) {
  return (
    <Button
      size={size}
      className={cn('min-w-[5.5rem] rounded-xl px-4', className)}
      {...props}
    />
  )
}

/** 次要操作按钮（取消、测试连接等） */
export function AdminButtonOutline({
  className,
  size = 'lg',
  variant = 'outline',
  ...props
}: AdminButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('min-w-[5.5rem] rounded-xl px-4', className)}
      {...props}
    />
  )
}

/** 表格/列表行内操作 */
export function AdminButtonGhost({
  className,
  ...props
}: AdminButtonProps) {
  return <TableActionButton className={className} {...props} />
}

/** 图标按钮（刷新等） */
export function AdminButtonIcon({
  className,
  variant = 'outline',
  ...props
}: AdminButtonProps) {
  return (
    <TableActionIconButton
      variant={variant}
      className={cn('size-9 rounded-xl', className)}
      {...props}
    />
  )
}

/** 表单底部按钮区 */
export function AdminFormActions({
  children,
  className,
  bordered = true,
}: {
  children: ReactNode
  className?: string
  bordered?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 pt-1',
        bordered && 'border-t border-border pt-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** 页顶摘要条 */
export function AdminSummaryBar({
  children,
  className,
  actions,
}: {
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground',
        adminPanelPadding,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Tab 导航容器 */
export function AdminTabList({
  children,
  className,
  trailing,
}: {
  children: ReactNode
  className?: string
  trailing?: ReactNode
}) {
  return (
    <nav className={cn('flex flex-wrap items-center gap-1.5 border-b border-border pb-3', className)}>
      {children}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </nav>
  )
}

/** Tab 按钮 */
export function AdminTabTrigger({
  active,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-xs'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** 状态胶囊 */
export function AdminStatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'success' | 'warning' | 'neutral' | 'info'
  className?: string
}) {
  const toneClass = {
    success: 'bg-emerald-100 text-emerald-900',
    warning: 'bg-amber-100 text-amber-900',
    info: 'bg-sky-100 text-sky-900',
    neutral: 'bg-muted text-muted-foreground',
  }[tone]

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase',
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  )
}

/** 提示块（需 Secret 等） */
export function AdminNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(adminNoticeClass, className)}>{children}</div>
}

/** 复用 toolbar 样式（若需单独引用） */
export { adminToolbarClass, adminPanelPadding }
