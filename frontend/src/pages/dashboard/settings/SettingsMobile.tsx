import { useState } from 'react'
import { Settings } from 'lucide-react'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import { SettingsFeedbackCard } from '@/components/dashboard/SettingsFeedbackCard'
import { PixelAvatarModal } from '@/components/avatars/PixelAvatarModal'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { PersonalSettingsRows } from '@/components/dashboard/PersonalSettingsRows'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { useSettings } from './useSettings'

/** 账户设置 — 手机：单列卡片栈（账户 / 反馈 / 主题）。 */
export function SettingsMobile() {
  const { t } = useTranslation(['dashboard'])
  const { profile, loading, onVerified } = useSettings()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  return (
    <AppPageStack compact>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={
          loading ? (
            <InlineTitleSkeleton />
          ) : (
            profile?.username ?? t('dashboard:settings.defaultTitle')
          )
        }
        icon={Settings}
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.accountTitle')}
          description={t('dashboard:settings.accountDesc')}
        />
        <AppShellCardBody>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <AccountSettingsSections
              profile={profile}
              onVerified={onVerified}
              onOpenAvatarEditor={() => setAvatarModalOpen(true)}
              variant="page"
            />
          )}
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.feedbackTitle')}
          description={t('dashboard:settings.feedbackDesc')}
        />
        <AppShellCardBody>
          <SettingsFeedbackCard />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.themeTitle')}
          description={t('dashboard:settings.themeDesc')}
        />
        <AppShellCardBody>
          <PersonalSettingsRows />
        </AppShellCardBody>
      </AppShellCard>

      <PixelAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </AppPageStack>
  )
}
