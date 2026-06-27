import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { AppPageIntro, AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { PendingPayOrderBanner } from '@/components/billing/PendingPayOrderBanner'
import { useTranslation } from 'react-i18next'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { useBillingBills } from './useBillingBills'
import { BillingBillContent } from './BillingSections'
import { BillingWalletCard } from '@/components/billing/BillingWalletCard'

/** 我的账单 — 桌面：费用概览 + 钱包。 */
export function BillingDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { usage, costTrends, loading, payReturnChecking } = useBillingBills()

  return (
    <AppPageStack className="gap-8">
      <AppPageIntro
        eyebrow={t('dashboard:billing.billsEyebrow')}
        title={t('dashboard:billing.billsTitle')}
        action={
          <Button asChild variant="outline" className={APP_BTN_MD}>
            <Link to="/pricing">
              <Receipt className="mr-2 size-4" />
              {t('dashboard:billing.viewPlans')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <AppShellCard className="flex h-full flex-col">
          <AppShellCardHeader title={t('dashboard:billing.billTitle')} />
          <AppShellCardBody className="flex flex-1 flex-col">
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
        <AppShellCard className="flex h-full flex-col">
          <AppShellCardHeader title={t('dashboard:billing.walletTitle')} />
          <AppShellCardBody className="flex flex-1 flex-col">
            <BillingWalletCard />
          </AppShellCardBody>
        </AppShellCard>
      </div>

      <PendingPayOrderBanner layout="row" />
    </AppPageStack>
  )
}
