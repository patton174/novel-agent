import { Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'

const ORDER: ThemeMode[] = ['light', 'dark', 'system']

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

interface MarketingThemeToggleProps {
  compact?: boolean
  className?: string
}

/** 营销顶栏：点击循环 浅色 → 深色 → 跟随系统（无 Radix 下拉，避免混淆 chunk 内失效） */
export function MarketingThemeToggle({ compact = false, className }: MarketingThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const Icon = ICONS[theme] ?? Monitor

  const cycle = () => {
    const idx = ORDER.indexOf(theme)
    setTheme(ORDER[(idx + 1) % ORDER.length] ?? 'system')
  }

  const label =
    theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`主题：${label}`}
      title={`主题：${label}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-sm active:scale-[0.97]',
        compact ? 'size-8' : 'h-9 px-3 text-sm font-medium',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  )
}
