import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import { logout } from '@/utils/authApi'
import { runUiTransition } from '@/lib/uiTransition'
import { LOCALE_STORAGE_KEY } from '@/lib/appSessionState'
import { NotificationBell } from '@/components/notification/NotificationBell'

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'system']

const ICONS = {
  light: PixelIcons.Sun,
  dark: PixelIcons.Moon,
  system: PixelIcons.Monitor,
} as const

/** 仪表盘 / 管理台顶栏：主题，语言、退出 */
export function AppShellToolbar() {
  const { t, i18n } = useTranslation(['common'])
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const isEn = i18n.language.startsWith('en')

  const ThemeIcon = ICONS[theme] ?? PixelIcons.Monitor

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme)
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length] ?? 'system')
  }

  const toggleLocale = () => {
    const next = isEn ? 'zh' : 'en'
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch { /* ignore */ }
    runUiTransition(() => {
      void i18n.changeLanguage(next)
    })
  }

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login', { replace: true })
    })
  }

  const btnClass = cn(editorPixelIconButtonClass(), 'text-foreground')

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <NotificationBell />
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={t('common:theme.label')}
        title={t('common:theme.label')}
        className={btnClass}
      >
        <ThemeIcon />
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={t('common:locale.label')}
        title={t('common:locale.label')}
        className={btnClass}
      >
        <PixelIcons.Globe />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        aria-label={t('common:nav.logout')}
        title={t('common:nav.logout')}
        className={btnClass}
      >
        <PixelIcons.Logout />
      </button>
    </div>
  )
}
