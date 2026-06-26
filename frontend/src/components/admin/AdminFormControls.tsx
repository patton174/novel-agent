import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import type { ComponentProps } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  PixelBadge,
  PixelNativeSelect,
  PixelTableActionButton,
  PIXEL_FOCUS_RING,
  PIXEL_INPUT,
} from '@/components/pixel'
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
        'grid min-w-0 flex-1 gap-1.5',
        isForm ? 'sm:max-w-none' : 'min-w-[140px] sm:max-w-xs',
        className,
      )}
    >
      <span
        className={cn(
          'font-medium text-foreground',
          isForm ? 'text-xs' : 'text-xs',
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

const adminControlClass = PIXEL_INPUT

/** 管理台下拉框（像素风原生 select） */
export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <PixelNativeSelect className={cn(adminControlClass, className)} {...props}>
      {children}
    </PixelNativeSelect>
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

type AdminActionSize = 'sm' | 'md' | 'lg'

type AdminButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  size?: AdminActionSize
  /** @deprecated 管理台按钮统一映射为 shadcn variant，保留仅为兼容旧调用 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

type AdminButtonGhostProps = AdminButtonProps & Pick<ComponentProps<typeof Button>, 'asChild'>

function mapAdminButtonSize(size: AdminActionSize): ComponentProps<typeof Button>['size'] {
  if (size === 'lg') return 'lg'
  if (size === 'md') return 'default'
  return 'sm'
}

const adminActionButtonClass = 'gap-1.5 shadow-none'

/** 主操作按钮（保存、创建等） */
export function AdminButton({ className, size = 'sm', variant: _variant, ...props }: AdminButtonProps) {
  return (
    <Button
      variant="default"
      size={mapAdminButtonSize(size)}
      className={cn(adminActionButtonClass, className)}
      {...props}
    />
  )
}

/** 次要操作按钮（取消、测试连接等） */
export function AdminButtonOutline({
  className,
  size = 'sm',
  variant: _variant,
  ...props
}: AdminButtonProps) {
  return (
    <Button
      variant="outline"
      size={mapAdminButtonSize(size)}
      className={cn(adminActionButtonClass, className)}
      {...props}
    />
  )
}

const adminGhostLinkClass = cn(
  'inline-flex h-7 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-2 text-xs font-medium text-foreground hover:bg-muted hover:text-foreground',
  PIXEL_FOCUS_RING,
)

/** 表格/列表行内操作 */
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
    return <Button asChild className={cn(adminGhostLinkClass, className)} {...props} />
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

/** 图标按钮（刷新等） */
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
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn('shrink-0 text-muted-foreground hover:text-foreground', className)}
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
        bordered && 'border-t border-border pt-3',
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
        'flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
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
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
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
