import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
import type { UserProfile } from '@/stores/userStore'
import { useTranslation } from 'react-i18next'

interface AccountSettingsSectionsProps {
  profile: UserProfile | null
  onVerified?: () => void
  onOpenAvatarEditor?: () => void
  /** Modal / compact: stack billing link below panel */
  variant?: 'page' | 'embedded'
}

/** Shared account UI — dashboard page, editor settings, and sidebar all use this */
export function AccountSettingsSections({
  profile,
  onVerified,
  onOpenAvatarEditor,
  variant = 'page',
}: AccountSettingsSectionsProps) {
  const { t } = useTranslation(['dashboard'])
  return (
    <div className={variant === 'embedded' ? 'space-y-4' : 'space-y-6'}>
      <AccountSettingsPanel profile={profile} onVerified={onVerified} onOpenAvatarEditor={onOpenAvatarEditor} />
      <div className={variant === 'embedded' ? 'space-y-2 border-t border-border/60 pt-4' : undefined}>
        {variant === 'embedded' ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard:account.billingSection')}
          </p>
        ) : null}
        <Button asChild variant={variant === 'embedded' ? 'outline' : 'default'} className={APP_BTN_FULL_MD}>
          <Link to="/dashboard/billing">
            <CreditCard className="mr-2 size-4" />
            {t('dashboard:account.openBilling')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
