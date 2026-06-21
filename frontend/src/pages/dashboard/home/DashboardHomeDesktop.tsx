import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { DashboardActivityTrendChart } from '@/components/dashboard/DashboardActivityTrendChart'
import { ProAreaChart } from '@/components/pro/charts/ProAreaChart'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { formatTokenCount } from '@/api/billingApi'
import { useDashboardHome } from './useDashboardHome'
import {
  ProIconNovel,
  ProIconPencil,
  ProIconLibrary,
} from '@/components/pro/icons/proIcons'

/**
 * 仪表盘首页 · 桌面端。Neo-Brutalist Editorial：
 * 直角、粗黑边界、硬错位投影、荧光绿+宝蓝撞色、超大 font-black 标题、无图标 KPI、mono 功能标记。
 */
export function DashboardHomeDesktop() {
  useMarkRouteSeen()

  const {
    t,
    summary,
    recentNovels,
    activity,
    tokenTrends,
    loadError,
    loading,
    activityLoading,
    tokenLoading,
    primaryNovelId,
    editorEntryHref,
    formatUpdatedAt,
  } = useDashboardHome()

  const tokenSeries = (tokenTrends ?? []).map((p) => ({ date: p.date, tokens: p.tokens ?? 0 }))
  const tokenTotal = tokenSeries.reduce((s, p) => s + (p.tokens ?? 0), 0)

  // Calculate peak and active days from activity
  const days = activity?.days ?? []
  const visibleCells = days.filter((d) => d.date)
  const peakValue = visibleCells.length > 0
    ? Math.max(...visibleCells.map((d) => d.writingWords + d.agentRuns * 800))
    : 0
  const activeDays = visibleCells.filter((d) => d.writingWords > 0 || d.agentRuns > 0).length

  return (
    <div className="flex flex-col gap-10">
      {/* Hero：mono eyebrow + 超大压迫标题 + 主 CTA */}
      <header className="flex flex-col gap-6 border-b-2 border-black pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            [ {t('dashboard:home.eyebrow')} ]
          </span>
          <h1 className="text-4xl font-black uppercase leading-[0.9] tracking-tighter text-ink md:text-6xl">
            {t('dashboard:home.title')}
          </h1>
          <p className="max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">{t('dashboard:home.desc')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/dashboard/novels"
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-soft transition-all hover:bg-neon active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <ProIconLibrary size={16} />
            {t('dashboard:home.manageNovels')}
          </Link>
          <Link
            to={editorEntryHref}
            className="inline-flex h-11 items-center gap-2 border-2 border-black bg-primary px-6 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-soft transition-all hover:bg-neon hover:text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <ProIconPencil size={16} />
            {primaryNovelId ? t('dashboard:home.continueWriting') : t('dashboard:home.enterEditor')}
          </Link>
        </div>
      </header>

      {/* KPI：黑边白面网格，8项指标横排 */}
      <section className="grid grid-cols-2 gap-0 border-2 border-black sm:grid-cols-4 xl:grid-cols-8">
        <KpiTile
          label={t('dashboard:home.statNovelCount')}
          value={loading ? null : (summary?.novelCount ?? 0)}
          index={0}
        />
        <KpiTile
          label={t('dashboard:home.statChapterCount')}
          value={loading ? null : (summary?.chapterCount ?? 0)}
          index={1}
        />
        <KpiTile
          label={t('dashboard:home.statWeeklyWords')}
          value={loading ? null : (summary?.weeklyWordCount ?? 0)}
          index={2}
        />
        <KpiTile
          label={t('dashboard:home.statAgentRuns')}
          value={loading ? null : (summary?.agentRunCount ?? 0)}
          index={3}
        />
        <KpiTile
          label={t('dashboard:home.sidePeak')}
          value={activityLoading ? null : peakValue}
          index={4}
        />
        <KpiTile
          label={t('dashboard:home.sideActiveDays')}
          value={activityLoading ? null : activeDays}
          index={5}
        />
        <KpiTile
          label={t('dashboard:home.tokenTitle')}
          value={tokenLoading ? null : tokenTotal}
          formatValue={(v) => formatTokenCount(v as number)}
          index={6}
        />
        <KpiTile
          label={t('dashboard:home.trendRange30')}
          value={tokenLoading ? null : tokenSeries.length}
          suffix="天"
          index={7}
        />
      </section>

      {/* 活跃趋势（左大）+ 热图（右） */}
      <section className="flex flex-col gap-4">
        <SectionLabel>{t('dashboard:home.activitySection')}</SectionLabel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-h-[320px] border-2 border-black bg-white shadow-soft">
            <DashboardActivityTrendChart days={activity?.days ?? []} loading={activityLoading} />
          </div>
          <div className="min-h-[320px] border-2 border-black bg-white shadow-soft">
            <ActivityHeatmap activity={activity} loading={activityLoading} />
          </div>
        </div>
      </section>

      {/* Token 消耗趋势 */}
      <section className="flex flex-col gap-4">
        <SectionLabel>{t('dashboard:home.tokenTitle')}</SectionLabel>
        <div className="border-2 border-black bg-white shadow-soft">
          {tokenLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <ProAreaChart
              data={tokenSeries}
              xKey="date"
              valueKey="tokens"
              height={240}
              emptyText={t('dashboard:home.tokenEmpty')}
              formatValue={(v) => formatTokenCount(Number(v))}
            />
          )}
        </div>
      </section>

      {/* 最近编辑 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>{t('dashboard:home.recentEdits')}</SectionLabel>
          <Link
            to="/dashboard/novels"
            className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:text-ink"
          >
            {t('dashboard:home.viewAll')}
            <ProIconNovel size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="border-2 border-black bg-white">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-black/20 px-6 py-5 last:border-b-0">
                <Skeleton className="size-11" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : recentNovels!.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center shadow-soft">
            <h3 className="text-xl font-black uppercase tracking-tight text-ink">
              {loadError ? t('dashboard:home.loadFail') : t('dashboard:home.noNovels')}
            </h3>
            <p className="mt-2 max-w-sm font-mono text-sm leading-relaxed text-muted-foreground">
              {loadError ? t('dashboard:home.loadFailDesc') : t('dashboard:home.noNovelsDesc')}
            </p>
            <Link
              to={EDITOR_CREATE_HREF}
              className="mt-6 inline-flex h-11 items-center gap-2 border-2 border-black bg-primary px-6 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-soft transition-all hover:bg-neon hover:text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <ProIconNovel size={16} />
              {t('dashboard:home.createNovel')}
            </Link>
          </div>
        ) : (
          <div className="border-2 border-black bg-white shadow-soft">
            {recentNovels!.map((novel) => (
              <div
                key={novel.novelId}
                className="group flex items-center gap-4 border-b border-black/20 px-6 py-5 transition-colors last:border-b-0 hover:bg-neon"
              >
                {novel.coverUrl ? (
                  <img
                    src={novel.coverUrl}
                    alt=""
                    className="size-11 shrink-0 border-2 border-black object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center border-2 border-black bg-muted text-ink">
                    <ProIconNovel size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-ink">{novel.title}</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {t('dashboard:home.recentlyEdited', { time: formatUpdatedAt(novel.updatedAt) })}
                  </p>
                </div>
                <Link
                  to={editorNovelHref(novel.novelId)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 border-2 border-black bg-white px-3 font-mono text-xs font-bold uppercase tracking-wider text-ink transition-colors group-hover:bg-ink group-hover:text-neon"
                >
                  <ProIconPencil size={14} />
                  {t('dashboard:home.continueWriting')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/** 小节标签：mono uppercase，宝蓝编号感 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">// {children}</p>
  )
}

/** 单个 KPI 单元：数字 + 标签 */
function KpiTile({
  label,
  value,
  formatValue,
  suffix,
  index,
}: {
  label: string
  value: number | null
  formatValue?: (v: number) => string
  suffix?: string
  index: number
}) {
  const displayValue = value !== null ? (formatValue ? formatValue(value) : value.toLocaleString()) : '—'
  return (
    <div className={cnBorder(index)}>
      {value === null ? (
        <Skeleton className="h-10 w-20" />
      ) : (
        <p className="text-xl font-black tabular-nums tracking-tight text-ink lg:text-2xl">
          {displayValue}{suffix}
        </p>
      )}
      <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground lg:text-xs">{label}</p>
    </div>
  )
}

/** KPI 网格单元边框：与相邻单元共享黑线，避免双线。 */
function cnBorder(index: number) {
  const left = index % 8 === 0 ? '' : 'lg:border-l'
  const top = index >= 4 ? 'border-t lg:border-t-0' : ''
  const smTop = index % 2 === 0 ? '' : 'border-l'
  return `flex flex-col justify-center gap-1.5 bg-white px-4 py-5 lg:px-5 ${left} ${top} ${smTop} border-black/20`
}
