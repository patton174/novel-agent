import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ProIconSun, ProIconMoon, ProIconMonitor, ProIconLanguage, ProIconLogout } from '@/components/pro/icons/proIcons'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import { logout } from '@/utils/authApi'
import { runUiTransition } from '@/lib/uiTransition'
import { LOCALE_STORAGE_KEY } from '@/lib/appSessionState'

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'system']

/** 仪表盘 / 管理台顶栏：主题，语言、退出 */
export function AppShellToolbar() {
  const { t, i18n } = useTranslation(['common'])
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const isEn = i18n.language.startsWith('en')

  const ThemeIcon = theme === 'light' ? ProIconSun : theme === 'dark' ? ProIconMoon : ProIconMonitor

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

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={t('common:theme.label')}
        title={t('common:theme.label')}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-sm active:scale-[0.97] size-8'
        )}
      >
        <ThemeIcon size={16} />
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={t('common:locale.label')}
        title={t('common:locale.label')}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-sm active:scale-[0.97] size-8'
        )}
      >
        <ProIconLanguage size={16} />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        aria-label={t('common:nav.logout')}
        title={t('common:nav.logout')}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-sm active:scale-[0.97] size-8'
        )}
      >
        <ProIconLogout size={16} />
      </button>
    </div>
  )
}
