import { Moon, Sun, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'

const ORDER: ThemeMode[] = ['light', 'dark', 'system']

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

interface ThemeToggleProps {
  compact?: boolean
  className?: string
}

/** 点击循环 浅色 → 深色 → 跟随系统（无 Radix 下拉，避免混淆 chunk 内失效） */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { t } = useTranslation(['common'])
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const Icon = ICONS[theme] ?? Monitor

  const cycle = () => {
    const idx = ORDER.indexOf(theme)
    setTheme(ORDER[(idx + 1) % ORDER.length] ?? 'system')
  }

  const label =
    theme === 'light'
      ? t('common:theme.light')
      : theme === 'dark'
        ? t('common:theme.dark')
        : t('common:theme.system')

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t('common:theme.label', { mode: label })}
      title={t('common:theme.label', { mode: label })}
      className={cn(
        editorPixelIconButtonClass(),
        compact ? 'size-8' : 'h-9 px-3 text-sm font-medium normal-case',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  )
}
