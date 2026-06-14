import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { authFieldClass } from './authFieldClass'

export function AuthCodeField({
  label,
  id,
  error,
  hint,
  action,
  inputClassName,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  id: string
  error?: string
  hint?: ReactNode
  action: ReactNode
  inputClassName?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            authFieldClass,
            'min-w-0 flex-1',
            error &&
              'border-destructive/60 focus:border-destructive/60 focus:ring-destructive/20',
            inputClassName,
          )}
          {...props}
        />
        {action}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-ui-sm leading-snug text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-ui-sm leading-snug text-emerald-600 dark:text-emerald-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
