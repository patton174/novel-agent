import { useTranslation } from 'react-i18next'
import { PayCheckoutPanel } from '@/components/billing/PayCheckoutPanel'
import { AppModalShell } from '@/components/ui/AppModalShell'

interface PayCheckoutDialogProps {
  open: boolean
  planCode: string | null
  onOpenChange: (open: boolean) => void
}

export function PayCheckoutDialog({ open, planCode, onOpenChange }: PayCheckoutDialogProps) {
  const { t } = useTranslation(['dashboard'])

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:billing.payTitle')}
      description={t('dashboard:billing.payDesc')}
      size="form"
      className="sm:max-w-4xl"
    >
      <PayCheckoutPanel
        layout="embedded"
        planCode={planCode}
        enabled={open}
        onCancel={() => onOpenChange(false)}
      />
    </AppModalShell>
  )
}
