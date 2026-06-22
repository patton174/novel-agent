import { Link, useLocation } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { Button } from '@/components/ui/button'
import { AppShellToolbar } from '@/components/layout/AppShellToolbar'
import { APP_BTN_SM } from '@/lib/appButtonTokens'
import { useTranslation } from 'react-i18next'
import { ProIconAdminSystem, ProIconOverview } from '@/components/pro/icons/proIcons'

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
        <>
          <Button
            asChild
            variant="outline"
            size="icon"
            className={`size-9 border-border/80 bg-background/80 sm:hidden ${APP_BTN_SM}`}
            aria-label={t('dashboard:quickActions.admin')}
            title={t('dashboard:quickActions.admin')}
          >
            <Link to="/admin">
              <ProIconAdminSystem size={16} />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`hidden h-9 gap-1.5 border-border/80 bg-background/80 px-3 text-xs font-medium sm:inline-flex ${APP_BTN_SM}`}
          >
            <Link to="/admin">
              <ProIconAdminSystem size={14} />
              {t('dashboard:quickActions.admin')}
            </Link>
          </Button>
        </>
      ) : null}
      {!hideEditorCta ? (
        <Button asChild size="sm" className={`h-9 gap-1.5 px-4 text-xs font-semibold ${APP_BTN_SM}`}>
          <Link to="/editor">
            <ProIconOverview size={14} />
            {t('dashboard:quickActions.editor')}
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
