import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { DashboardActivityTrendChart } from '@/components/dashboard/DashboardActivityTrendChart'
import { ProChartKpi } from '@/components/pro/ProChartKpi'
import { ProAreaChart } from '@/components/pro/charts/ProAreaChart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN, APP_BTN_MD } from '@/lib/appButtonTokens'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { formatTokenCount } from '@/api/billingApi'
import { useDashboardHome } from './useDashboardHome'
import { ProIconPencil, ProIconLibrary, ProIconArrowRight, ProIconNovel } from '@/components/pro/icons/proIcons'

export function DashboardHomeMobile() {
  useMarkRouteSeen()

  const {
    t,
    recentNovels,
    activity,
    tokenTrends,
    loadError,
    loading,
    activityLoading,
    tokenLoading,
    primaryNovelId,
    editorEntryHref,
    topKpiCards,
    formatUpdatedAt,
  } = useDashboardHome()

  const tokenSeries = (tokenTrends ?? []).map((p) => ({
    date: p.date,
    tokens: p.tokens ?? 0,
  }))

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t('dashboard:home.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard:home.desc')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className={APP_BTN_MD}>
            <Link to={editorEntryHref}>
              <ProIconPencil size={16} className="mr-2" />
              {primaryNovelId ? t('dashboard:home.continueWriting') : t('dashboard:home.enterEditor')}
            </Link>
          </Button>
          <Button asChild variant="outline" className={APP_BTN_MD}>
            <Link to="/dashboard/novels">{t('dashboard:home.manageNovels')}</Link>
          </Button>
        </div>
      </header>

      <div className="space-y-3">
        {topKpiCards.map((card) => (
          <ProChartKpi
            key={card.key}
            label={card.label}
            value={card.value}
            loading={loading || activityLoading}
            className="w-full"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t('dashboard:home.tokenTitle')}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('dashboard:home.tokenDesc')}
            </p>
          </div>
        </div>
        {tokenLoading ? (
          <Skeleton className="h-[160px] w-full rounded-xl" />
        ) : (
          <ProAreaChart
            data={tokenSeries}
            xKey="date"
            valueKey="tokens"
            height={160}
            emptyText={t('dashboard:home.tokenEmpty')}
            formatValue={(v) => formatTokenCount(Number(v))}
          />
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <DashboardActivityTrendChart
          days={activity?.days ?? []}
          loading={activityLoading}
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <ActivityHeatmap activity={activity} loading={activityLoading} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {t('dashboard:home.recentEdits')}
          </h2>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-primary">
            <Link to="/dashboard/novels">
              {t('dashboard:home.viewAll')}
              <ProIconArrowRight size={14} />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        ) : recentNovels!.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <ProIconNovel size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {loadError ? t('dashboard:home.loadFail') : t('dashboard:home.noNovels')}
            </h3>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
              {loadError
                ? t('dashboard:home.loadFailDesc')
                : t('dashboard:home.noNovelsDesc')}
            </p>
            <Button asChild className={`mt-4 px-6 ${APP_BTN_MD}`}>
              <Link to={EDITOR_CREATE_HREF}>{t('dashboard:home.createNovel')}</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentNovels!.map((novel) => (
              <div
                key={novel.novelId}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-hover"
              >
                {novel.coverUrl ? (
                  <img
                    src={novel.coverUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-md object-cover ring-1 ring-border"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                    <ProIconNovel size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('dashboard:home.recentlyEdited', { time: formatUpdatedAt(novel.updatedAt) })}
                  </p>
                </div>
                <Button asChild size="sm" className={`shrink-0 px-3 ${APP_BTN}`}>
                  <Link to={editorNovelHref(novel.novelId)}>
                    {t('dashboard:home.continueWriting')}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
