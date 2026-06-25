import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** 表格行内操作按钮统一样式（管理端 + 仪表盘） */
export const tableActionButtonClass =
  'h-8 rounded-lg px-3 text-sm font-normal shadow-none'

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
        'flex flex-wrap items-center gap-1.5',
        align === 'end' && 'justify-end',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TableActionButton({
  className,
  variant = 'ghost',
  size = 'sm',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(tableActionButtonClass, className)}
      {...props}
    />
  )
}

export function TableActionIconButton({
  className,
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('rounded-lg shadow-none', className)}
      {...props}
    />
  )
}
