import { cn } from '@/lib/utils'

/** 全站表单 / 工具栏控件统一高度 */
export const FORM_CONTROL_HEIGHT = 'h-9'

export const FORM_CONTROL_RADIUS = 'rounded-lg'

/** 聚焦与过渡 — 柔和、有质感 */
export const formFocusClass = cn(
  'outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out',
  'focus-visible:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-primary/12',
  'dark:focus-visible:ring-primary/22',
)

/** 输入 / 下拉共用表面 */
export const formSurfaceClass = cn(
  'border border-border/75 bg-background text-foreground',
  'shadow-[0_1px_2px_rgba(0,0,0,0.035)]',
  'placeholder:text-muted-foreground/75',
  'hover:border-border',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
  formFocusClass,
)

export const formInputClass = cn(
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_RADIUS,
  'w-full min-w-0 px-3 text-sm leading-none',
  formSurfaceClass,
)

export const formSelectClass = cn(formInputClass, 'appearance-none pr-9')

/** Radix Select 触发器 */
export const formSelectTriggerClass = cn(
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_RADIUS,
  'flex w-full items-center justify-between gap-2 px-3 text-sm whitespace-nowrap',
  formSurfaceClass,
)

export const formButtonClass = cn(
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_RADIUS,
  'inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 text-sm font-medium leading-none',
  'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out',
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
  formFocusClass,
)

export const formButtonPrimaryClass = cn(
  formButtonClass,
  'border border-primary/90 bg-primary text-primary-foreground',
  'shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-primary/92 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]',
)

export const formButtonOutlineClass = cn(
  formButtonClass,
  formSurfaceClass,
  'hover:bg-muted/40',
)

export const formButtonGhostClass = cn(
  formButtonClass,
  'border border-transparent bg-transparent shadow-none',
  'text-foreground hover:bg-muted/55',
)

/** 并排控件行（输入 + 按钮） */
export const formControlRowClass = 'flex flex-wrap items-center gap-2'

export const formActionsClass = 'flex flex-wrap items-center gap-2'

export const formLabelClass = 'text-xs font-medium tracking-wide text-foreground/85'

export const formFieldStackClass = 'grid min-w-0 gap-1.5'

/** 多选标签 / Chip */
export const formChipBaseClass = cn(
  FORM_CONTROL_RADIUS,
  'inline-flex h-8 items-center border px-3 text-xs font-medium transition-colors duration-200',
  formFocusClass,
)

export const formChipSelectedClass =
  'border-primary/45 bg-primary/8 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]'

export const formChipIdleClass =
  'border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground'
