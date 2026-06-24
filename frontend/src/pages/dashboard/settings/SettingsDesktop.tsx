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

/** 账户设置 — 桌面：账户卡全宽 + 反馈/主题双栏。复用既有子组件，不改写表单。 */
export function SettingsDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { profile, loading, onVerified } = useSettings()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  return (
    <AppPageStack>
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

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      <PixelAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </AppPageStack>
  )
}
