import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formButtonOutlineClass } from '@/components/shared/formControlTokens'

/** 表格行内文字按钮统一样式（管理端 + 仪表盘） */
export const tableActionButtonClass =
  'h-7 gap-1 rounded-md px-2.5 text-xs font-medium shadow-none'

/** 与表单控件同高的表格内按钮（绑定行、内联控件等） */
export const tableFormActionButtonClass = formButtonOutlineClass

/** 表格行内图标按钮统一样式 */
export const tableActionIconButtonClass = 'size-7 shrink-0 rounded-md shadow-none'

export const tableActionBarClass = 'flex flex-wrap items-center gap-1'

export type TableActionTone = 'default' | 'primary' | 'danger' | 'ghost'

/** 兼容 PixelTableActionButton 旧 variant 名 */
export type TableActionLegacyVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'subtle'
  | 'link'

export function mapLegacyTableActionVariant(
  variant: TableActionLegacyVariant | undefined,
): TableActionTone {
  switch (variant) {
    case 'primary':
      return 'default'
    case 'danger':
      return 'danger'
    case 'ghost':
    case 'link':
      return 'ghost'
    case 'secondary':
    case 'subtle':
    default:
      return 'default'
  }
}

function resolveTableActionTone(tone: TableActionTone): {
  variant: ComponentProps<typeof Button>['variant']
  className?: string
} {
  switch (tone) {
    case 'danger':
      return {
        variant: 'outline',
        className:
          'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
      }
    case 'ghost':
      return { variant: 'ghost' }
    case 'primary':
    case 'default':
    default:
      return { variant: 'outline' }
  }
}

export function TableActionBar({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'end' | 'center'
}) {
  return (
    <div
      className={cn(
        tableActionBarClass,
        align === 'end' && 'justify-end',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

function isLegacyTableActionVariant(
  variant: unknown,
): variant is TableActionLegacyVariant {
  return (
    variant === 'primary' ||
    variant === 'secondary' ||
    variant === 'ghost' ||
    variant === 'danger' ||
    variant === 'subtle' ||
    variant === 'link'
  )
}

type TableActionButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  tone?: TableActionTone
  variant?: TableActionLegacyVariant | ComponentProps<typeof Button>['variant']
  size?: 'sm' | 'md' | 'lg' | 'icon'
  /** compact=h-7 行内链接；form=h-9 与输入框对齐 */
  density?: 'compact' | 'form'
}

export function TableActionButton({
  className,
  tone,
  variant,
  size: _size,
  density = 'compact',
  ...props
}: TableActionButtonProps) {
  if (density === 'form') {
    const resolved = resolveTableActionTone(
      tone ?? (isLegacyTableActionVariant(variant) ? mapLegacyTableActionVariant(variant) : 'default'),
    )
    return (
      <Button
        variant={resolved.variant}
        size="lg"
        className={cn(tableFormActionButtonClass, resolved.className, className)}
        {...props}
      />
    )
  }

  if (tone || isLegacyTableActionVariant(variant)) {
    const resolved = resolveTableActionTone(tone ?? mapLegacyTableActionVariant(variant as TableActionLegacyVariant))
    return (
      <Button
        variant={resolved.variant}
        size="sm"
        className={cn(tableActionButtonClass, resolved.className, className)}
        {...props}
      />
    )
  }

  return (
    <Button
      variant={variant ?? 'outline'}
      size="sm"
      className={cn(tableActionButtonClass, className)}
      {...props}
    />
  )
}

type TableActionIconButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  tone?: TableActionTone
  variant?: TableActionLegacyVariant | ComponentProps<typeof Button>['variant']
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export function TableActionIconButton({
  className,
  tone,
  variant,
  size: _size,
  ...props
}: TableActionIconButtonProps) {
  if (tone || isLegacyTableActionVariant(variant)) {
    const resolved = resolveTableActionTone(tone ?? mapLegacyTableActionVariant(variant as TableActionLegacyVariant))
    return (
      <Button
        variant={resolved.variant}
        size="icon-sm"
        className={cn(tableActionIconButtonClass, resolved.className, className)}
        {...props}
      />
    )
  }

  return (
    <Button
      variant={variant ?? 'outline'}
      size="icon-sm"
      className={cn(tableActionIconButtonClass, className)}
      {...props}
    />
  )
}
