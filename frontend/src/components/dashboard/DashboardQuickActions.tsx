import { Link, useLocation } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { AppShellToolbar } from '@/components/layout/AppShellToolbar'
import { useTranslation } from 'react-i18next'
import { PixelIcons } from '@/components/icons/PixelIcons'
import {
  editorPixelButtonClass,
  editorPixelIconButtonClass,
  editorPrimaryButtonClass,
} from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

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
          <Link
            to="/admin"
            aria-label={t('dashboard:quickActions.admin')}
            title={t('dashboard:quickActions.admin')}
            className={cn(editorPixelIconButtonClass(), 'text-foreground sm:hidden')}
          >
            <PixelIcons.Shield />
          </Link>
          <Link
            to="/admin"
            className={cn(
              editorPixelButtonClass(),
              'hidden h-9 items-center gap-1.5 px-3 text-xs normal-case sm:inline-flex',
            )}
          >
            <PixelIcons.Shield />
            {t('dashboard:quickActions.admin')}
          </Link>
        </>
      ) : null}
      {!hideEditorCta ? (
        <Link
          to="/editor"
          className={cn(
            editorPrimaryButtonClass(),
            'inline-flex h-9 items-center gap-1.5 px-4 text-xs font-semibold normal-case',
          )}
        >
          <PixelIcons.Library />
          {t('dashboard:quickActions.editor')}
        </Link>
      ) : null}
    </div>
  )
}
