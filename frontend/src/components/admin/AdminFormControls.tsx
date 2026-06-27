import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  PixelBadge,
  PixelTableActionButton,
} from '@/components/pixel'
import {
  FormChip,
  FormControlRow,
  FormInput,
  FormSelect,
} from '@/components/shared/FormControls'
import {
  formActionsClass,
  formButtonOutlineClass,
  formButtonPrimaryClass,
  formControlRowClass,
  formFieldStackClass,
  formInputClass,
  formLabelClass,
} from '@/components/shared/formControlTokens'
import {
  ToolbarButton,
  ToolbarGroup,
  ToolbarIconButton,
  ToolbarSearchInput,
} from '@/components/shared/ToolbarControls'
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
  htmlFor,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
  /** toolbar：筛选条；form：弹窗/配置表单 */
  layout?: 'toolbar' | 'form'
  htmlFor?: string
}) {
  const isForm = layout === 'form'
  return (
    <div
      className={cn(
        formFieldStackClass,
        isForm ? 'w-full' : 'min-w-[140px] flex-1 sm:max-w-xs',
        className,
      )}
    >
      {label ? (
        <label htmlFor={htmlFor} className={formLabelClass}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? (
        <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

const adminControlClass = formInputClass

/** 并排控件行（输入 + 按钮等同高） */
export const AdminControlRow = FormControlRow

/** 工具栏控件行（搜索 + 刷新等） */
export const AdminToolbarGroup = ToolbarGroup

/** 工具栏文字按钮，与输入框同高 */
export const AdminToolbarButton = ToolbarButton

/** 工具栏图标按钮，与输入框同高 */
export const AdminToolbarIconButton = ToolbarIconButton

/** 管理台搜索框 */
export function AdminSearchInput({
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <ToolbarSearchInput className={className} inputClassName={inputClassName} {...props} />
  )
}

/** 管理台下拉框 */
export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FormSelect className={className} {...props}>
      {children}
    </FormSelect>
  )
}

/** 管理台文本输入 */
export function AdminTextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <FormInput className={className} {...props} />
}

/** 日期时间输入 */
export function AdminDateTimeInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      type="datetime-local"
      className={cn(
        adminControlClass,
        'py-0 leading-9',
        '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70',
        className,
      )}
      {...props}
    />
  )
}

/** 多选 Chip（套餐功能项等） */
export const AdminFormChip = FormChip

/** 弹窗表单垂直间距 */
export const adminFormStackClass = 'grid gap-4 py-2'

export function AdminFormStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(adminFormStackClass, className)}>{children}</div>
}

/** 弹窗两列字段行 — 顶对齐，避免左列 hint 撑高导致错位 */
export const adminFormRowClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start'

/** 表单网格：四列等宽字段 */
export const adminFormGridClass = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-start'

/** 表单网格：两列 */
export const adminFormRowWideClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 items-start'

/** @deprecated 使用 adminFormRowWideClass */
export const adminFormGridWideClass = adminFormRowWideClass

type AdminActionSize = 'sm' | 'md' | 'lg'

type AdminButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  size?: AdminActionSize
  /** @deprecated 管理台按钮统一 h-9，保留仅为兼容旧调用 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

type AdminButtonGhostProps = AdminButtonProps & Pick<ComponentProps<typeof Button>, 'asChild'>

/** 主操作按钮（保存、创建等） */
export function AdminButton({ className, size: _size, variant: _variant, ...props }: AdminButtonProps) {
  return (
    <Button
      variant="default"
      size="lg"
      className={cn(formButtonPrimaryClass, className)}
      {...props}
    />
  )
}

/** 次要操作按钮（取消、测试连接等） */
export function AdminButtonOutline({
  className,
  size: _size,
  variant: _variant,
  ...props
}: AdminButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      className={cn(formButtonOutlineClass, className)}
      {...props}
    />
  )
}

/** 表格/列表行内操作 — 保持紧凑 h-7 */
export function AdminButtonGhost({
  className,
  asChild,
  variant,
  size,
  loading: _loading,
  leftIcon: _leftIcon,
  rightIcon: _rightIcon,
  ...props
}: AdminButtonGhostProps) {
  if (asChild) {
    return (
      <Button
        asChild
        className={cn(
          'inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent px-2 text-xs font-medium text-foreground hover:bg-muted/55',
          className,
        )}
        {...props}
      />
    )
  }
  return (
    <PixelTableActionButton
      className={className}
      variant={
        variant === 'danger' ? 'danger' : variant === 'ghost' ? 'ghost' : undefined
      }
      {...props}
    />
  )
}

/** 图标按钮（刷新等）— 工具栏场景请用 AdminToolbarIconButton */
export function AdminButtonIcon({
  className,
  variant: _variant,
  size: _size,
  loading: _loading,
  leftIcon: _leftIcon,
  rightIcon: _rightIcon,
  ...props
}: AdminButtonProps) {
  return (
    <ToolbarIconButton
      variant="ghost"
      className={cn('text-muted-foreground hover:text-foreground', className)}
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
        formActionsClass,
        bordered && 'border-t border-border/80 pt-3',
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
        'flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/80 bg-muted/15 px-3 py-2 text-xs text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">{children}</div>
      {actions ? <div className={cn(formControlRowClass, 'shrink-0')}>{actions}</div> : null}
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
    <nav className={cn('flex flex-wrap items-center gap-1.5 border-b border-border/80 pb-3', className)}>
      {children}
      {trailing ? <div className={cn(formControlRowClass, 'ml-auto')}>{trailing}</div> : null}
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
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors duration-200',
        active
          ? 'bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
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
  const pixelTone =
    tone === 'success'
      ? 'success'
      : tone === 'warning'
        ? 'warning'
        : tone === 'info'
          ? 'info'
          : 'muted'

  return (
    <PixelBadge tone={pixelTone} className={className}>
      {children}
    </PixelBadge>
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
export { FORM_CONTROL_HEIGHT as adminToolbarControlHeight } from '@/components/shared/formControlTokens'

export { FormField as AdminFormField } from '@/components/shared/FormControls'