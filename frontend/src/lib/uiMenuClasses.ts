import { cn } from '@/lib/utils'

export const KEBAB_ROOT = 'inline-flex shrink-0'

export function kebabTriggerClass(open?: boolean) {
  return cn(
    'inline-flex size-7 items-center justify-center rounded-lg p-0 cursor-pointer',
    'border border-border/70 bg-muted/45 text-foreground/80 transition-colors',
    '[&_svg]:size-4',
    open ? 'border-primary/45 bg-primary/10 text-foreground' : '',
    'hover:border-primary/35 hover:bg-primary/10 hover:text-foreground',
    'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(79,70,229,0.45)] focus-visible:text-foreground',
  )
}

export const KEBAB_MENU_PANEL =
  'rounded-[10px] border border-border bg-popover p-[0.3rem] text-popover-foreground shadow-md'

export function kebabMenuItemClass(danger?: boolean) {
  return cn(
    'block w-full rounded-[7px] border-none bg-transparent px-[0.7rem] py-2 text-left',
    'font-[inherit] text-[0.8rem] font-medium cursor-pointer',
    danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-primary/10',
  )
}

export function dropdownRootClass(fullWidth?: boolean) {
  return cn(fullWidth ? 'relative flex w-full' : 'relative inline-flex')
}

export function dropdownTriggerClass(opts: {
  pill: boolean
  size: 'sm' | 'md'
  fullWidth: boolean
  open: boolean
}) {
  return cn(
    'inline-flex items-center justify-center gap-1.5 box-border cursor-pointer',
    'border font-[inherit] font-semibold leading-none text-muted-foreground',
    'bg-background transition-colors',
    opts.open
      ? 'border-primary/45 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]'
      : 'border-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    opts.fullWidth ? 'w-full' : 'w-auto',
    opts.size === 'sm' ? 'px-[0.65rem] text-[0.72rem]' : 'text-[0.74rem]',
    opts.size === 'sm' ? '' : opts.pill ? 'px-[0.7rem] py-[0.35rem]' : 'px-3 py-[0.45rem]',
    opts.pill ? 'rounded-full' : 'rounded-[10px]',
    '[&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
    'hover:border-primary/35 hover:bg-primary/10 hover:text-foreground',
    'disabled:cursor-not-allowed disabled:opacity-50',
  )
}

export function dropdownChevronClass(open?: boolean) {
  return cn('inline-flex transition-transform', open && 'rotate-180')
}

export const DROPDOWN_MENU_PANEL =
  'rounded-xl border border-border bg-popover p-[0.35rem] text-popover-foreground shadow-md'

export function dropdownMenuOptionClass(active?: boolean) {
  return cn(
    'flex w-full items-center gap-2 rounded-lg border px-[0.7rem] py-[0.55rem]',
    'font-[inherit] text-[0.82rem] text-left cursor-pointer',
    active
      ? 'border-primary/45 bg-primary/10 font-semibold text-foreground'
      : 'border-transparent bg-transparent font-medium text-muted-foreground',
    '[&_svg]:size-3.5 [&_svg]:shrink-0',
    active ? '[&_svg]:text-primary' : '[&_svg]:text-muted-foreground',
    'hover:bg-primary/10 hover:text-foreground',
    '[&+&]:mt-0.5',
  )
}

export const MOTION_TAB_TRACK =
  'relative inline-flex items-center gap-1.5'

export const MOTION_TAB_INDICATOR =
  'absolute z-0 rounded-lg border border-primary/30 bg-primary/10 pointer-events-none'

export function motionTabButtonClass(active?: boolean) {
  return cn(
    'relative z-[1] inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5',
    'font-[inherit] text-xs font-medium cursor-pointer shadow-xs transition-colors',
    active
      ? 'border-primary/35 text-foreground'
      : 'border-border text-muted-foreground',
    'hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45',
  )
}

export function motionTabIconClass(active?: boolean) {
  return cn(
    'inline-flex items-center text-muted-foreground [&_svg]:size-3.5',
    active && 'text-primary',
  )
}
