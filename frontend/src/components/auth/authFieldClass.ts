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
