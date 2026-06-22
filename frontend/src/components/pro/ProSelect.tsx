import { useState, type ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ProIconChevronDown } from '@/components/pro/icons/proIcons'
import { cn } from '@/lib/utils'

export interface ProSelectOption {
  value: string
  label: ReactNode
}

export interface ProSelectProps {
  value: string
  options: ProSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** default = 圆角轻边框；pixel = Neo-Brutalist 直角黑边 */
  variant?: 'default' | 'pixel'
  id?: string
  'aria-label'?: string
}

export function ProSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className,
  variant = 'default',
  id,
  'aria-label': ariaLabel,
}: ProSelectProps) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  const isPixel = variant === 'pixel'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex h-9 min-w-[8rem] items-center justify-between gap-2 text-sm text-foreground transition-colors',
            isPixel
              ? 'w-full border-2 border-black bg-white px-3 font-mono text-xs font-bold uppercase tracking-wide shadow-soft hover:bg-neon/30'
              : 'rounded-xl border border-border/60 bg-surface px-3 hover:bg-muted',
            className,
          )}
        >
          <span className={cn('truncate text-left', !current && 'text-muted-foreground')}>
            {current?.label ?? placeholder}
          </span>
          <ProIconChevronDown size={16} className="shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          'min-w-[var(--radix-dropdown-menu-trigger-width)]',
          isPixel && 'rounded-none border-2 border-black bg-white p-1 shadow-soft',
        )}
      >
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => {
              onChange(o.value)
              setOpen(false)
            }}
            className={cn(
              'gap-2',
              isPixel &&
                'rounded-none font-mono text-xs font-bold uppercase tracking-wide focus:bg-neon focus:text-ink',
              o.value === value && isPixel && 'bg-neon/40 text-ink',
            )}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
