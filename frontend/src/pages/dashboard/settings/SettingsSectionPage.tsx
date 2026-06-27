import { useState, type ReactElement } from 'react'
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
import { PersonalModelCredentials } from '@/components/dashboard/PersonalModelCredentials'
import { PersonalSettingsRows } from '@/components/dashboard/PersonalSettingsRows'
import { ReferralPanel } from '@/pages/dashboard/ReferralPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import type { SettingsSection } from './settingsSections'
import { useSettings } from './useSettings'

function SettingsProfileSection() {
  const { t } = useTranslation(['dashboard'])
  const { profile, loading, onVerified } = useSettings()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  return (
    <>
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
      <PixelAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </>
  )
}

function SettingsModelsSection() {
  const { t } = useTranslation(['dashboard'])

  return (
    <>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={t('dashboard:settings.modelSettingsTitle')}
      />
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.modelSettingsTitle')}
          description={t('dashboard:settings.modelSettingsDesc')}
        />
        <AppShellCardBody>
          <PersonalModelCredentials />
        </AppShellCardBody>
      </AppShellCard>
    </>
  )
}

function SettingsPreferencesSection() {
  const { t } = useTranslation(['dashboard'])

  return (
    <>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={t('dashboard:settings.themeTitle')}
      />
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.themeTitle')}
          description={t('dashboard:settings.themeDesc')}
        />
        <AppShellCardBody>
          <PersonalSettingsRows />
        </AppShellCardBody>
      </AppShellCard>
    </>
  )
}

function SettingsReferralSection() {
  const { t } = useTranslation(['dashboard'])

  return (
    <>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={t('dashboard:referral.title')}
      />
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:referral.title')}
          description={t('dashboard:referral.cardDesc')}
        />
        <AppShellCardBody>
          <ReferralPanel />
        </AppShellCardBody>
      </AppShellCard>
    </>
  )
}

function SettingsFeedbackSection() {
  const { t } = useTranslation(['dashboard'])

  return (
    <>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={t('dashboard:settings.feedbackTitle')}
      />
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.feedbackTitle')}
          description={t('dashboard:settings.feedbackDesc')}
        />
        <AppShellCardBody>
          <SettingsFeedbackCard />
        </AppShellCardBody>
      </AppShellCard>
    </>
  )
}

const SECTION_RENDERERS: Record<SettingsSection, () => ReactElement> = {
  profile: SettingsProfileSection,
  models: SettingsModelsSection,
  preferences: SettingsPreferencesSection,
  referral: SettingsReferralSection,
  feedback: SettingsFeedbackSection,
}

export function SettingsSectionPage({ section }: { section: SettingsSection }) {
  const isDesktop = useIsDesktop()
  const Section = SECTION_RENDERERS[section]

  return (
    <AppPageStack compact={!isDesktop}>
      <Section />
    </AppPageStack>
  )
}
