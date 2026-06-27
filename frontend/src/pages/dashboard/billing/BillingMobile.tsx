import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { PendingPayOrderBanner } from '@/components/billing/PendingPayOrderBanner'
import { useTranslation } from 'react-i18next'
import { useBillingBills } from './useBillingBills'
import { BillingBillContent } from './BillingSections'
import { BillingWalletCard } from '@/components/billing/BillingWalletCard'

/** 我的账单 — 手机：费用 + 钱包。 */
export function BillingMobile() {
  const { t } = useTranslation(['dashboard'])
  const { usage, costTrends, loading, payReturnChecking } = useBillingBills()

  return (
    <AppPageStack className="gap-8">
      <AppPageIntro
        eyebrow={t('dashboard:billing.billsEyebrow')}
        title={t('dashboard:billing.billsTitle')}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/pricing">
              <Receipt className="mr-1.5 size-4" />
              {t('dashboard:billing.viewPlans')}
            </Link>
          </Button>
        }
      />

      <AppShellCard>
        <AppShellCardHeader title={t('dashboard:billing.billTitle')} />
        <AppShellCardBody>
          <BillingBillContent
            usage={usage}
            costTrends={costTrends}
            loading={loading}
            payReturnChecking={payReturnChecking}
            billsPage
            embedded
          />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader title={t('dashboard:billing.walletTitle')} />
        <AppShellCardBody>
          <BillingWalletCard />
        </AppShellCardBody>
      </AppShellCard>

      <PendingPayOrderBanner layout="row" />
    </AppPageStack>
  )
}
