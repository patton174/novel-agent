import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { authFieldClass } from './authFieldClass'

export function AuthField({
  label,
  hint,
  id,
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  inputClassName?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      <input id={id} className={cn(authFieldClass, inputClassName)} {...props} />
    </div>
  )
}
