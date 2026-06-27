import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, type PlanPublic } from '@/api/billingApi'
import { createUpgradeRequest } from '@/api/billingApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appToast } from '@/stores/appToastStore'

type RequestType = 'plan' | 'quota_bonus'

export function UpgradeRequestDialog({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}) {
  const { t } = useTranslation(['dashboard'])
  const [requestType, setRequestType] = useState<RequestType>('plan')
  const [planCode, setPlanCode] = useState('')
  const [tokenBonus, setTokenBonus] = useState('')
  const [runBonus, setRunBonus] = useState('')
  const [reason, setReason] = useState('')
  const [plans, setPlans] = useState<PlanPublic[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    void fetchPlans()
      .then((list) => {
        setPlans(list.filter((p) => p.code !== 'hobby'))
        if (list.length > 0 && !planCode) {
          const firstPaid = list.find((p) => p.code !== 'hobby')
          if (firstPaid) setPlanCode(firstPaid.code)
        }
      })
      .catch(() => setPlans([]))
  }, [open, planCode])

  const handleSubmit = async () => {
    let targetValue = ''
    if (requestType === 'plan') {
      targetValue = planCode.trim()
      if (!targetValue) {
        appToast.info(t('dashboard:billing.upgradePlanRequired'))
        return
      }
    } else {
      const tokens = Number(tokenBonus.trim() || '0')
      const runs = Number(runBonus.trim() || '0')
      if (tokens <= 0 && runs <= 0) {
        appToast.info(t('dashboard:billing.upgradeQuotaRequired'))
        return
      }
      targetValue = JSON.stringify({ tokenBonus: tokens, runBonus: runs })
    }

    setSubmitting(true)
    try {
      await createUpgradeRequest({
        requestType,
        targetValue,
        reason: reason.trim() || undefined,
      })
      appToast.success(t('dashboard:billing.upgradeSubmitted'))
      onOpenChange(false)
      setReason('')
      onSubmitted?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:billing.upgradeSubmitFail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={t('dashboard:billing.requestUpgrade')}
      description={t('dashboard:billing.upgradeDialogDesc')}
    >
      <div className="space-y-4 py-2">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={requestType === 'plan' ? 'default' : 'outline'}
            onClick={() => setRequestType('plan')}
          >
            {t('dashboard:billing.upgradeTypePlan')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={requestType === 'quota_bonus' ? 'default' : 'outline'}
            onClick={() => setRequestType('quota_bonus')}
          >
            {t('dashboard:billing.quotaBonus')}
          </Button>
        </div>

        {requestType === 'plan' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="upgrade-plan">
              {t('dashboard:billing.upgradePlanLabel')}
            </label>
            <select
              id="upgrade-plan"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="token-bonus">
                {t('dashboard:billing.tokenBonusLabel')}
              </label>
              <Input
                id="token-bonus"
                type="number"
                min={0}
                value={tokenBonus}
                onChange={(e) => setTokenBonus(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="run-bonus">
                {t('dashboard:billing.runBonusLabel')}
              </label>
              <Input
                id="run-bonus"
                type="number"
                min={0}
                value={runBonus}
                onChange={(e) => setRunBonus(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="upgrade-reason">
            {t('dashboard:billing.upgradeReasonLabel')}
          </label>
          <Input
            id="upgrade-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('dashboard:billing.upgradeReasonPlaceholder')}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('dashboard:billing.payCancel')}
        </Button>
        <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
          {t('dashboard:billing.upgradeSubmit')}
        </Button>
      </DialogFooter>
    </AppModalShell>
  )
}
