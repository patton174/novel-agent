import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { logout } from '@/utils/authApi'

/** 仪表盘 / 管理台顶栏：主题、语言、退出 */
export function AppShellToolbar() {
  const { t } = useTranslation(['common'])
  const navigate = useNavigate()

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login', { replace: true })
    })
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <ThemeToggle compact />
      <LocaleToggle compact />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-8 shrink-0"
        aria-label={t('common:nav.logout')}
        title={t('common:nav.logout')}
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}
