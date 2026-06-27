import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  fetchReferralStats,
  type ReferralReferrerRow,
  type ReferralStatsOverview,
} from '@/api/referralAdminApi'
import { AdminButtonOutline } from '@/components/admin/AdminFormControls'
import { AdminResponsivePixelTable } from '@/components/admin/AdminResponsivePixelTable'
import { PixelCellMono, PixelCellStack, PIXEL_MOBILE_CARD, type PixelColumn } from '@/components/pixel'
import { cn } from '@/lib/utils'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { adminFormatLocale } from '@/components/admin/adminUiTokens'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

function formatPercent(value: number, locale: string): string {
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`
}

export default function ReferralStatsPage() {
  const { t } = useTranslation(['admin'])
  const dateLocale = adminFormatLocale(i18n.language)
  useMarkRouteSeen()

  const [stats, setStats] = useState<ReferralStatsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReferralStats({ limit: 50 })
      setStats(data)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:referral.errors.loadStats'))
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<PixelColumn<ReferralReferrerRow>[]>(
    () => [
      {
        key: 'user',
        header: t('admin:referral.colUser'),
        render: (row) => (
          <PixelCellStack
            title={row.username?.trim() || t('admin:referral.anonymousUser')}
            subtitle={<PixelCellMono>{row.userId}</PixelCellMono>}
          />
        ),
      },
      {
        key: 'code',
        header: t('admin:referral.colCode'),
        render: (row) => <PixelCellMono>{row.code}</PixelCellMono>,
      },
      {
        key: 'referrals',
        header: t('admin:referral.colReferrals'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums">{row.referralCount.toLocaleString(dateLocale)}</span>
        ),
      },
      {
        key: 'paid',
        header: t('admin:referral.colPaid'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums">{row.paidCount.toLocaleString(dateLocale)}</span>
        ),
      },
      {
        key: 'conversion',
        header: t('admin:referral.colConversion'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums">{formatPercent(row.conversionRate, dateLocale)}</span>
        ),
      },
    ],
    [dateLocale, t],
  )

  return (
    <AdminDataPage>
      <AdminStatStrip
        loading={loading && !stats}
        items={[
          {
            label: t('admin:referral.statTotalReferrals'),
            value: (stats?.totalReferrals ?? 0).toLocaleString(dateLocale),
          },
          {
            label: t('admin:referral.statTotalPaid'),
            value: (stats?.totalPaid ?? 0).toLocaleString(dateLocale),
          },
          {
            label: t('admin:referral.statConversion'),
            value: formatPercent(stats?.conversionRate ?? 0, dateLocale),
          },
        ]}
      />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:referral.title')}
          description={t('admin:referral.desc')}
          action={
            <AdminButtonOutline type="button" onClick={() => void load()} disabled={loading}>
              {t('admin:referral.refresh')}
            </AdminButtonOutline>
          }
        />
        <AdminDataPanelBody className="space-y-4">
          {loading && !stats ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <>
              <AdminDataPanel>
                <AdminDataPanelHeader
                  title={t('admin:referral.topReferrersTitle')}
                  description={t('admin:referral.topReferrersDesc')}
                />
                <AdminDataPanelBody className="p-0">
                  <AdminResponsivePixelTable
                    columns={columns}
                    data={stats?.topReferrers ?? []}
                    rowKey={(row) => row.userId}
                    loading={loading}
                    emptyText={t('admin:referral.empty')}
                    renderMobileCard={(row) => (
                      <article className={cn(PIXEL_MOBILE_CARD, 'p-4')}>
                        <p className="font-mono text-sm font-bold">
                          {row.username?.trim() || t('admin:referral.anonymousUser')}
                        </p>
                        <PixelCellMono className="mt-0.5 text-muted-foreground">{row.code}</PixelCellMono>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <dt className="text-muted-foreground">{t('admin:referral.colReferrals')}</dt>
                            <dd className="font-semibold tabular-nums">{row.referralCount}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t('admin:referral.colPaid')}</dt>
                            <dd className="font-semibold tabular-nums">{row.paidCount}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t('admin:referral.colConversion')}</dt>
                            <dd className="font-semibold tabular-nums">
                              {formatPercent(row.conversionRate, dateLocale)}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    )}
                  />
                </AdminDataPanelBody>
              </AdminDataPanel>
            </>
          )}
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
