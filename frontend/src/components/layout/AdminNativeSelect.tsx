import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** 管理台原生 select — 与 Input / shadcn 控件视觉对齐 */
export function AdminNativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground',
        'shadow-xs transition-colors',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
