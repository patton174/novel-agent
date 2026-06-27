import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  formatCostMicros,
  getBalance,
  redeemCode,
  redeemGiftCode,
  fetchMyUpgradeRequests,
} from '@/api/billingApi'
import type { UpgradeRequest } from '@/types/billing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { UpgradeRequestDialog } from './UpgradeRequestDialog'

type RedeemMode = 'gift' | 'wallet'

export function BillingWalletCard() {
  const { t } = useTranslation(['dashboard'])
  const [balanceMicros, setBalanceMicros] = useState(0)
  const [code, setCode] = useState('')
  const [redeemMode, setRedeemMode] = useState<RedeemMode>('gift')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [myRequests, setMyRequests] = useState<UpgradeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)

  const loadWallet = useCallback(async () => {
    setLoading(true)
    try {
      const [bal, requests] = await Promise.all([getBalance(), fetchMyUpgradeRequests()])
      setBalanceMicros(bal.balanceMicros)
      setMyRequests(Array.isArray(requests) ? requests : [])
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:billing.walletLoadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadWallet()
  }, [loadWallet])

  const handleRedeem = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      appToast.info(
        redeemMode === 'gift'
          ? t('dashboard:gift.codeRequired')
          : t('dashboard:billing.codeRequired'),
      )
      return
    }
    setRedeeming(true)
    try {
      if (redeemMode === 'gift') {
        const result = await redeemGiftCode(trimmed)
        setCode('')
        appToast.success(result.message?.trim() || t('dashboard:gift.redeemSuccess'))
      } else {
        const result = await redeemCode(trimmed)
        setCode('')
        appToast.success(result.applied || t('dashboard:billing.redeemSuccess'))
        await loadWallet()
      }
    } catch (err) {
      appToast.error(
        err instanceof Error
          ? err.message
          : redeemMode === 'gift'
            ? t('dashboard:gift.redeemFail')
            : t('dashboard:billing.redeemFail'),
      )
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          {balanceMicros < 0 ? t('dashboard:billing.debt') : t('dashboard:billing.balance')}
        </p>
        <p
          className={cn(
            'mt-2 text-4xl font-black tabular-nums tracking-tight',
            balanceMicros < 0 ? 'text-rose-600' : 'text-foreground',
          )}
        >
          {formatCostMicros(balanceMicros)}
        </p>
        {balanceMicros < 0 ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
            {t('dashboard:billing.debtHint')}
          </p>
        ) : null}
      </div>

      <div className="border-t border-black/10 pt-5">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          {t('dashboard:billing.redeemSectionTitle')}
        </p>
        <div className="mt-3 inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border-2 border-black p-0.5">
          {(['gift', 'wallet'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setRedeemMode(mode)
                setCode('')
              }}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold leading-none transition-colors',
                redeemMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`dashboard:billing.redeemMode.${mode}`)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {redeemMode === 'gift'
            ? t('dashboard:billing.redeemHintGift')
            : t('dashboard:billing.redeemHintWallet')}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            className="h-10 font-mono sm:flex-1"
            placeholder={
              redeemMode === 'gift'
                ? t('dashboard:gift.codePlaceholder')
                : t('dashboard:billing.codePlaceholder')
            }
            value={code}
            disabled={redeeming}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRedeem()
            }}
          />
          <Button
            type="button"
            className={cn('h-10 shrink-0 gap-2 sm:min-w-[7.5rem]', APP_BTN_MD)}
            disabled={redeeming}
            onClick={() => void handleRedeem()}
          >
            {redeeming ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('dashboard:gift.redeeming')}
              </>
            ) : (
              <>
                <Gift className="size-4" aria-hidden />
                {t('dashboard:billing.redeem')}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="border-t border-black/10 pt-5">
        <Button type="button" variant="outline" className={APP_BTN_MD} onClick={() => setUpgradeOpen(true)}>
          {t('dashboard:billing.requestUpgrade')}
        </Button>
        {myRequests.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {myRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">
                  {r.requestType === 'plan' ? r.targetValue : t('dashboard:billing.quotaBonus')}
                </span>
                <span
                  className={cn(
                    'font-medium',
                    r.status === 'approved'
                      ? 'text-emerald-600'
                      : r.status === 'rejected'
                        ? 'text-rose-600'
                        : 'text-amber-600',
                  )}
                >
                  {t(`dashboard:billing.status.${r.status}`, r.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <UpgradeRequestDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onSubmitted={() => void loadWallet()}
      />
    </div>
  )
}
