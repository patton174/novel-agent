import { Shield, PenLine } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { Button } from '@/components/ui/button'
import { AppShellToolbar } from '@/components/layout/AppShellToolbar'
import { APP_BTN_SM } from '@/lib/appButtonTokens'
import { useTranslation } from 'react-i18next'

export function DashboardQuickActions() {
  const { t } = useTranslation(['dashboard'])
  const location = useLocation()
  const profile = useUserStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'
  const hideEditorCta = location.pathname.startsWith('/dashboard')

  return (
    <div className="flex shrink-0 items-center gap-2">
      <AppShellToolbar />
      {isAdmin ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className={`hidden h-9 gap-1.5 border-border/80 bg-background/80 px-3 text-xs font-medium sm:inline-flex ${APP_BTN_SM}`}
        >
          <Link to="/admin">
            <Shield className="size-3.5" />
            {t('dashboard:quickActions.admin')}
          </Link>
        </Button>
      ) : null}
      {!hideEditorCta ? (
        <Button asChild size="sm" className={`h-9 gap-1.5 px-4 text-xs font-semibold ${APP_BTN_SM}`}>
          <Link to="/editor">
            <PenLine className="size-3.5" />
            {t('dashboard:quickActions.editor')}
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
