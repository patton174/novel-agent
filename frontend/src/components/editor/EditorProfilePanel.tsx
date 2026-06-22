import { useTranslation } from 'react-i18next'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Switch } from '@/components/ui/switch'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_CARD } from '@/lib/editorPixelClasses'

export interface EditorProfilePanelProps {
  onOpenAvatarEditor: () => void
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  mobileBottomInset?: number
}

export function EditorProfilePanel({
  onOpenAvatarEditor,
  hostModeEnabled,
  onHostModeChange,
  mobileBottomInset = 0,
}: EditorProfilePanelProps) {
  const { t } = useTranslation(['editor', 'dashboard', 'common'])
  const profile = useUserStore((s) => s.profile)

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      style={{ paddingBottom: `calc(1.5rem + ${mobileBottomInset}px)` }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        <AppPageStack compact className="gap-6">
          <AppPageIntro
            eyebrow={t('editor:profile.eyebrow')}
            title={profile?.username ?? t('editor:tabs.mine')}
          />

          <AppShellCard>
            <AppShellCardHeader
              title={t('dashboard:settings.accountTitle')}
              description={t('dashboard:settings.accountDesc')}
            />
            <AppShellCardBody>
              <AccountSettingsSections
                profile={profile}
                onOpenAvatarEditor={onOpenAvatarEditor}
                variant="page"
              />
            </AppShellCardBody>
          </AppShellCard>

          <AppShellCard>
            <AppShellCardHeader
              title={t('editor:settings.preference')}
              description={t('editor:settings.preferenceDesc')}
            />
            <AppShellCardBody>
              <div
                className={cn(
                  EDITOR_PIXEL_CARD,
                  'flex items-center justify-between gap-4 p-3 font-mono',
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
            </AppShellCardBody>
          </AppShellCard>
        </AppPageStack>
      </div>
    </div>
  )
}
