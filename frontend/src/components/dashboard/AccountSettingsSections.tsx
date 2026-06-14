import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
import type { UserProfile } from '@/stores/userStore'

interface AccountSettingsSectionsProps {
  profile: UserProfile | null
  onVerified?: () => void
  /** Modal / compact: stack billing link below panel */
  variant?: 'page' | 'embedded'
}

/** Shared account UI — dashboard page, editor settings, and sidebar all use this */
export function AccountSettingsSections({
  profile,
  onVerified,
  variant = 'page',
}: AccountSettingsSectionsProps) {
  return (
    <div className={variant === 'embedded' ? 'space-y-4' : 'space-y-6'}>
      <AccountSettingsPanel profile={profile} onVerified={onVerified} />
      <div className={variant === 'embedded' ? 'space-y-2 border-t border-border/60 pt-4' : undefined}>
        {variant === 'embedded' ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            账单与升级
          </p>
        ) : null}
        <Button asChild variant={variant === 'embedded' ? 'outline' : 'default'} className={APP_BTN_FULL_MD}>
          <Link to="/dashboard/billing">
            <CreditCard className="mr-2 size-4" />
            打开账单页
          </Link>
        </Button>
      </div>
    </div>
  )
}
