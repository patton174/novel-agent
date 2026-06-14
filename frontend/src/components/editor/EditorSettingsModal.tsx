import { useTranslation } from 'react-i18next'
import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { EditorButton } from '../ui/EditorButton'
import { Switch } from '../ui/switch'
import { DIRECT_PYTHON } from '../../config/runtime'
import { isLoggedIn } from '../../utils/auth'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'

interface EditorSettingsModalProps {
  open: boolean
  onClose: () => void
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  onLogout: () => void
}

export function EditorSettingsModal({
  open,
  onClose,
  hostModeEnabled,
  onHostModeChange,
  onLogout,
}: EditorSettingsModalProps) {
  const { t } = useTranslation(['editor', 'common'])
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const showAccount = !DIRECT_PYTHON && isLoggedIn()

  const refreshProfile = useCallback(() => {
    void fetchUserInfo()
      .then(setProfile)
      .catch(() => {
        /* ignore */
      })
  }, [setProfile])

  useEffect(() => {
    if (!open || !showAccount) return
    refreshProfile()
  }, [open, refreshProfile, showAccount])

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="settings"
      title={t('editor:settings.title')}
      description={t('editor:settings.desc')}
      className="sm:max-w-[480px]"
      bodyClassName="space-y-5 pb-1"
    >
      <section className="flex flex-col gap-3.5">
        <h3 className="m-0 border-b border-primary/20 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
          {t('editor:settings.preference')}
        </h3>
        <div
          className={cn(
            'flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3',
            'max-md:flex-col max-md:items-stretch max-md:gap-2.5',
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{t('common:glossary.hostMode')}</span>
            <span className="text-xs leading-snug text-muted-foreground">
              {t('editor:settings.hostModeDesc')}
            </span>
          </div>
          <Switch
            checked={hostModeEnabled}
            onCheckedChange={onHostModeChange}
            aria-label={t('common:glossary.hostMode')}
            className="shrink-0 self-end max-md:self-start"
          />
        </div>
      </section>

      {showAccount ? (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-primary/20 pb-1.5">
            <h3 className="m-0 text-xs font-semibold tracking-wide text-muted-foreground">{t('editor:settings.account')}</h3>
            <Link
              to="/dashboard/settings"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {t('editor:settings.fullSettings')}
              <ExternalLink className="size-3" />
            </Link>
          </div>
          <AccountSettingsSections
            profile={profile}
            onVerified={refreshProfile}
            variant="embedded"
          />
          <EditorButton type="button" variant="ghost" fullWidth onClick={onLogout}>
            {t('editor:settings.logout')}
          </EditorButton>
        </section>
      ) : null}
    </AppModalShell>
  )
}
