import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, RefreshCw, Server } from 'lucide-react'
import { AdminButtonOutline } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { PixelBadge } from '@/components/pixel'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { probeServiceHealth, type ServiceProbeResult } from '@/api/systemMonitoringApi'
import { Skeleton } from '@/components/ui/skeleton'

export default function SystemMonitoringPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [probes, setProbes] = useState<ServiceProbeResult[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const results = await probeServiceHealth()
      setProbes(results)
      setCheckedAt(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const upCount = probes?.filter((p) => p.status === 'up').length ?? 0
  const totalCount = probes?.length ?? 0

  return (
    <AdminDataPage>
      <AdminStatStrip
        items={[
          {
            label: t('admin:monitoring.servicesUp'),
            value: loading ? '—' : `${upCount}/${totalCount}`,
          },
          {
            label: t('admin:monitoring.lastCheck'),
            value: checkedAt ? checkedAt.toLocaleTimeString() : '—',
          },
        ]}
      />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:monitoring.title')}
          description={t('admin:monitoring.desc')}
          action={
            <AdminButtonOutline onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin:monitoring.refresh')}
            </AdminButtonOutline>
          }
        />
        <AdminDataPanelBody className="space-y-3">
          {loading && !probes ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : (
            probes?.map((probe) => (
              <div
                key={probe.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-border bg-muted/40 p-2">
                    {probe.kind === 'frontend' ? (
                      <Activity className="size-4 text-violet-600" />
                    ) : (
                      <Server className="size-4 text-sky-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{probe.label}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{probe.endpoint}</p>
                    {probe.detail ? (
                      <p className="mt-1 text-xs text-muted-foreground">{probe.detail}</p>
                    ) : null}
                    {probe.latencyMs != null ? (
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                        {t('admin:monitoring.latency', { ms: probe.latencyMs })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <PixelBadge tone={probe.status === 'up' ? 'success' : probe.status === 'degraded' ? 'warning' : 'danger'}>
                  {probe.status === 'up'
                    ? t('admin:monitoring.statusUp')
                    : probe.status === 'degraded'
                      ? t('admin:monitoring.statusDegraded')
                      : t('admin:monitoring.statusDown')}
                </PixelBadge>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">{t('admin:monitoring.hint')}</p>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
