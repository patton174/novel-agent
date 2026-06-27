import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  fetchReferralConversions,
  fetchUserReferral,
  type ReferralConversionItem,
  type UserReferralInfo,
} from '@/api/billingApi'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { copyToClipboard } from '@/utils/copyToClipboard'
import { resolveReferralLink } from '@/utils/referralLink'
import { appToast } from '@/stores/appToastStore'

function formatRegisteredAt(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReferralPanel() {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const [info, setInfo] = useState<UserReferralInfo | null>(null)
  const [conversions, setConversions] = useState<ReferralConversionItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [referral, rows] = await Promise.all([fetchUserReferral(), fetchReferralConversions()])
      setInfo(referral)
      setConversions(rows)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:referral.loadFail'))
      setInfo(null)
      setConversions([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const referralLink = useMemo(() => {
    if (!info?.code?.trim()) return ''
    return resolveReferralLink(info.code, info.referralLink)
  }, [info?.code, info?.referralLink])

  const columns = useMemo<ProColumn<ReferralConversionItem>[]>(
    () => [
      {
        key: 'user',
        header: t('dashboard:referral.colUser'),
        render: (row) => <span className="font-mono text-xs">{row.userLabel}</span>,
      },
      {
        key: 'registeredAt',
        header: t('dashboard:referral.colRegisteredAt'),
        render: (row) => (
          <span className="tabular-nums text-sm">
            {formatRegisteredAt(row.registeredAt, dateLocale)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('dashboard:referral.colStatus'),
        align: 'right',
        render: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              row.converted
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {row.converted
              ? t('dashboard:referral.statusConverted')
              : t('dashboard:referral.statusPending')}
          </span>
        ),
      },
    ],
    [dateLocale, t],
  )

  const handleCopyLink = () => {
    void copyToClipboard(referralLink, t('dashboard:referral.copySuccess'))
  }

  const handleCopyCode = () => {
    if (!info?.code) return
    void copyToClipboard(info.code, t('dashboard:referral.copyCodeSuccess'))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!info?.code) {
    return <p className="text-sm text-muted-foreground">{t('dashboard:referral.unavailable')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-stretch gap-2">
          <div
            id="referral-link"
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3"
          >
            <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-mono text-xs text-foreground">{referralLink}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn('h-10 shrink-0 gap-2 normal-case', APP_BTN_MD)}
            onClick={handleCopyLink}
          >
            <Copy className="size-3.5" />
            {t('dashboard:referral.copyLink')}
          </Button>
        </div>

        <div className="flex items-center gap-2 xl:shrink-0 xl:border-l xl:border-border xl:pl-4">
          <span className="shrink-0 text-sm text-muted-foreground">
            {t('dashboard:referral.codeLabel')}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 font-mono text-xs font-semibold text-foreground hover:bg-muted"
          >
            {info.code}
            <Copy className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('dashboard:referral.conversionTableTitle')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('dashboard:referral.conversionSummary', {
              referrals: info.referralCount.toLocaleString(dateLocale),
              paid: info.paidCount.toLocaleString(dateLocale),
            })}
          </p>
        </div>
        <ProTable
          columns={columns}
          data={conversions}
          rowKey="id"
          dense
          embedded
          emptyText={t('dashboard:referral.conversionsEmpty')}
        />
      </div>
    </div>
  )
}
