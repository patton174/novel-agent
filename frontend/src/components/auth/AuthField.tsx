import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { authFieldClass } from './authFieldClass'

export function AuthField({
  label,
  hint,
  error,
  id,
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  error?: string
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
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          authFieldClass,
          error &&
            'border-destructive/60 focus:border-destructive/60 focus:ring-destructive/20',
          inputClassName,
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-[11px] leading-snug text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
