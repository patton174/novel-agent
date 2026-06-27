import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Cpu, HardDrive, MemoryStick, RefreshCw, Server } from 'lucide-react'
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
import {
  fetchMonitoringSnapshot,
  formatGb,
  formatMb,
  formatPercent,
  formatUptime,
  serviceLabelKey,
  type MonitoringSnapshot,
  type ProbeStatus,
  type ServiceProbe,
} from '@/api/systemMonitoringApi'
import { Skeleton } from '@/components/ui/skeleton'

function statusTone(status: ProbeStatus): 'success' | 'warning' | 'danger' {
  if (status === 'up') return 'success'
  if (status === 'degraded') return 'warning'
  return 'danger'
}

function statusLabel(t: (key: string) => string, status: ProbeStatus): string {
  if (status === 'up') return t('admin:monitoring.statusUp')
  if (status === 'degraded') return t('admin:monitoring.statusDegraded')
  return t('admin:monitoring.statusDown')
}

function ServiceRow({ probe, t }: { probe: ServiceProbe; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const labelKey = serviceLabelKey(probe.id)
  const label = t(labelKey, { defaultValue: probe.id })
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-border bg-muted/40 p-2">
          <Server className="size-4 text-sky-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{label}</p>
          {probe.latencyMs != null ? (
            <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
              {t('admin:monitoring.latency', { ms: probe.latencyMs })}
            </p>
          ) : null}
        </div>
      </div>
      <PixelBadge tone={statusTone(probe.status)}>{statusLabel(t, probe.status)}</PixelBadge>
    </div>
  )
}

export default function SystemMonitoringPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMonitoringSnapshot()
      setSnapshot(data)
      setCheckedAt(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const upCount = snapshot?.services.filter((p) => p.status === 'up').length ?? 0
  const totalCount = snapshot?.services.length ?? 0
  const host = snapshot?.host
  const jvm = snapshot?.jvm

  const memoryPercent =
    host?.memoryUsedMb != null && host.memoryTotalMb != null && host.memoryTotalMb > 0
      ? Math.round((host.memoryUsedMb / host.memoryTotalMb) * 1000) / 10
      : null

  const diskPercent =
    host?.diskUsedGb != null && host.diskTotalGb != null && host.diskTotalGb > 0
      ? Math.round((host.diskUsedGb / host.diskTotalGb) * 1000) / 10
      : null

  const heapPercent =
    jvm && jvm.heapMaxMb > 0 ? Math.round((jvm.heapUsedMb / jvm.heapMaxMb) * 1000) / 10 : null

  return (
    <AdminDataPage>
      <AdminStatStrip
        loading={loading && !snapshot}
        items={[
          {
            label: t('admin:monitoring.servicesUp'),
            value: loading && !snapshot ? '—' : `${upCount}/${totalCount}`,
          },
          {
            label: t('admin:monitoring.cpu'),
            value: formatPercent(host?.cpuPercent ?? null),
          },
          {
            label: t('admin:monitoring.memory'),
            value: memoryPercent != null ? `${memoryPercent}%` : formatMb(host?.memoryUsedMb, host?.memoryTotalMb),
          },
          {
            label: t('admin:monitoring.lastCheck'),
            value: checkedAt ? checkedAt.toLocaleTimeString() : '—',
          },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminDataPanel>
          <AdminDataPanelHeader
            title={t('admin:monitoring.hostTitle')}
            description={t('admin:monitoring.hostDesc')}
          />
          <AdminDataPanelBody className="grid gap-3 sm:grid-cols-2">
            {loading && !snapshot ? (
              <>
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </>
            ) : (
              <>
                <HostMetricCard
                  icon={<Cpu className="size-4 text-orange-600" />}
                  label={t('admin:monitoring.cpu')}
                  value={formatPercent(host?.cpuPercent ?? null)}
                />
                <HostMetricCard
                  icon={<MemoryStick className="size-4 text-violet-600" />}
                  label={t('admin:monitoring.memory')}
                  value={formatMb(host?.memoryUsedMb, host?.memoryTotalMb)}
                  sub={memoryPercent != null ? `${memoryPercent}%` : undefined}
                />
                <HostMetricCard
                  icon={<HardDrive className="size-4 text-cyan-600" />}
                  label={t('admin:monitoring.disk')}
                  value={formatGb(host?.diskUsedGb, host?.diskTotalGb)}
                  sub={diskPercent != null ? `${diskPercent}%` : undefined}
                />
                <HostMetricCard
                  icon={<Activity className="size-4 text-emerald-600" />}
                  label={t('admin:monitoring.hostUptime')}
                  value={formatUptime(host?.uptimeSeconds ?? null)}
                />
              </>
            )}
          </AdminDataPanelBody>
        </AdminDataPanel>

        <AdminDataPanel>
          <AdminDataPanelHeader
            title={t('admin:monitoring.jvmTitle')}
            description={t('admin:monitoring.jvmDesc')}
          />
          <AdminDataPanelBody className="grid gap-3 sm:grid-cols-2">
            {loading && !snapshot ? (
              <>
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </>
            ) : (
              <>
                <HostMetricCard
                  icon={<MemoryStick className="size-4 text-amber-600" />}
                  label={t('admin:monitoring.heap')}
                  value={`${jvm?.heapUsedMb ?? 0} / ${jvm?.heapMaxMb ?? 0} MB`}
                  sub={heapPercent != null ? `${heapPercent}%` : undefined}
                />
                <HostMetricCard
                  icon={<Activity className="size-4 text-blue-600" />}
                  label={t('admin:monitoring.threads')}
                  value={String(jvm?.threads ?? 0)}
                />
                <HostMetricCard
                  icon={<Server className="size-4 text-indigo-600" />}
                  label={t('admin:monitoring.jvmUptime')}
                  value={formatUptime(jvm?.uptimeSeconds ?? null)}
                  className="sm:col-span-2"
                />
              </>
            )}
          </AdminDataPanelBody>
        </AdminDataPanel>
      </div>

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
          {loading && !snapshot ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : (
            snapshot?.services.map((probe) => <ServiceRow key={probe.id} probe={probe} t={t} />)
          )}
          <p className="text-xs text-muted-foreground">{t('admin:monitoring.hint')}</p>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}

function HostMetricCard({
  icon,
  label,
  value,
  sub,
  className,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-card px-4 py-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{sub}</p> : null}
    </div>
  )
}
