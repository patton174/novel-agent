import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { TrendPoint } from '@/api/adminApi'
import { PixelChartCard, PixelLineChart, PIXEL_CHART_EMPTY } from '@/components/pixel'
import { formatPixelChartDate, pixelChartNeon } from '@/components/pixel/charts/pixelChartTheme'
import { cn } from '@/lib/utils'

interface StatsTrendChartsProps {
  agentRunTrend: TrendPoint[]
  registrationTrend: TrendPoint[]
  rangeLabel: string
}

function TrendEmpty({ message, linkLabel }: { message: string; linkLabel: string }) {
  return (
    <div className={cn(PIXEL_CHART_EMPTY, 'flex-col gap-2')}>
      <p>{message}</p>
      <Link to="/admin/users" className="text-sm text-primary hover:underline">
        {linkLabel}
      </Link>
    </div>
  )
}

export default function StatsTrendCharts({
  agentRunTrend,
  registrationTrend,
  rangeLabel,
}: StatsTrendChartsProps) {
  const { t } = useTranslation(['admin'])
  return (
    <>
      <PixelChartCard
        title={t('admin:stats.agentRunTrend')}
        description={t('admin:stats.agentRunDesc', { range: rangeLabel })}
      >
        {agentRunTrend.length === 0 ? (
          <TrendEmpty
            message={t('admin:stats.noAgentRunTrend')}
            linkLabel={t('admin:stats.viewUsers')}
          />
        ) : (
          <PixelLineChart
            data={agentRunTrend}
            xKey="date"
            series={[
              {
                key: 'count',
                name: t('admin:stats.runCount'),
                color: pixelChartNeon.blue,
                fill: true,
              },
            ]}
            formatX={formatPixelChartDate}
          />
        )}
      </PixelChartCard>

      <PixelChartCard
        title={t('admin:stats.registrationTrend')}
        description={t('admin:stats.registrationDesc', { range: rangeLabel })}
      >
        {registrationTrend.length === 0 ? (
          <TrendEmpty
            message={t('admin:stats.noRegistrationTrend')}
            linkLabel={t('admin:stats.viewUsers')}
          />
        ) : (
          <PixelLineChart
            data={registrationTrend}
            xKey="date"
            series={[
              {
                key: 'count',
                name: t('admin:stats.registrationCount'),
                color: pixelChartNeon.green,
                fill: true,
              },
            ]}
            formatX={formatPixelChartDate}
          />
        )}
      </PixelChartCard>
    </>
  )
}
