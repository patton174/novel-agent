import { PixelIcons } from '@/components/icons/PixelIcons'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { useTranslation } from 'react-i18next'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'

const ORDER: ThemeMode[] = ['light', 'dark', 'system']

const ICONS = {
  light: PixelIcons.Sun,
  dark: PixelIcons.Moon,
  system: PixelIcons.Monitor,
} as const

interface MarketingThemeToggleProps {
  compact?: boolean
  className?: string
}

/** 营销顶栏：点击循环 浅色 → 深色 → 跟随系统 */
export function MarketingThemeToggle({ compact = false, className }: MarketingThemeToggleProps) {
  const { t } = useTranslation('common')
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const Icon = ICONS[theme] ?? PixelIcons.Monitor

  const cycle = () => {
    const idx = ORDER.indexOf(theme)
    setTheme(ORDER[(idx + 1) % ORDER.length] ?? 'system')
  }

  const label =
    theme === 'light'
      ? t('theme.light')
      : theme === 'dark'
        ? t('theme.dark')
        : t('theme.system')

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t('theme.label', { mode: label })}
      title={t('theme.label', { mode: label })}
      className={cn(
        editorPixelIconButtonClass(),
        compact ? 'size-8' : 'h-9 gap-1.5 px-3 text-sm font-medium normal-case text-foreground',
        className,
      )}
    >
      <Icon />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  )
}
