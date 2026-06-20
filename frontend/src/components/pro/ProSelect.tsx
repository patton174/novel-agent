import { useState, type ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { IconChevronDown, IconCheck } from '@tabler/icons-react'
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
}

export function ProSelect({ value, options, onChange, placeholder = '请选择', className }: ProSelectProps) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 min-w-[8rem] items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface px-3 text-sm text-foreground transition-colors hover:bg-muted',
            className,
          )}
        >
          <span className={cn(!current && 'text-muted-foreground')}>{current?.label ?? placeholder}</span>
          <IconChevronDown size={16} stroke={2} className="text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[8rem]">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} className="gap-2">
            <IconCheck size={14} stroke={2} className={cn(o.value === value ? 'opacity-100 text-primary' : 'opacity-0')} aria-hidden="true" />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
