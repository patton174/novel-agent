import { cn } from '@/lib/utils'

/**
 * Auth 输入框样式 —— Neo-Brutalist Editorial。
 * 直角、2px 黑边、focus 时宝蓝粗框 + 荧光绿淡底（非弥散光晕）。
 */
export const authFieldClass = cn(
  'w-full h-12 px-3.5 rounded-none border-2 border-foreground bg-surface',
  'font-mono text-sm text-foreground placeholder:text-muted-foreground/70',
  'transition-colors duration-150',
  'focus:outline-none focus:border-primary focus:bg-neon/25',
)

/** 邮箱行内「获取验证码」紧凑按钮（无 uppercase / 无 w-full） */
export const authCodeButtonClass = cn(
  'inline-flex h-12 w-[4.5rem] shrink-0 items-center justify-center',
  'border-2 border-foreground bg-surface px-1',
  'font-mono text-[10px] font-bold leading-none text-foreground',
  'shadow-[2px_2px_0_0_hsl(var(--foreground))]',
  'transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'sm:w-auto sm:min-w-[5.5rem] sm:px-2.5 sm:text-[11px]',
)
