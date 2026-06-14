import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DanmakuMarquee } from '@/components/marketing/danmaku/DanmakuMarquee'
import { useDanmakuFeed } from '@/components/marketing/danmaku/useDanmakuFeed'
import { MKT_CTA_ON_DARK_SM } from '@/lib/marketingCta'
export function HomeDanmakuSection() {
  const { t } = useTranslation('marketing')
  const { pool, loading, error, totalFetched, reload, loadMore } = useDanmakuFeed()

  return (
    <section
      id="voices"
      className="relative scroll-mt-16 overflow-hidden bg-marketing-dark pb-16 pt-20 text-white md:pb-20 md:pt-24"
    >
      <div className="mkt-starfield pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(99,102,241,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(139,92,246,0.15),transparent_50%)]" />

      <div className="relative mx-auto mb-8 flex max-w-4xl flex-col gap-2 px-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
            <Sparkles className="size-3.5" />
            {t('home.danmaku.eyebrow')}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t('home.danmaku.title')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{t('home.danmaku.subtitle')}</p>
        </div>
        {!loading && !error && totalFetched > 0 ? (
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tabular-nums text-slate-300">
            {t('home.danmaku.count', { count: totalFetched })}
          </p>
        ) : null}
      </div>

      <div className="relative mb-8 h-[200px] w-full md:h-[228px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-marketing-dark to-transparent sm:w-24 md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-marketing-dark to-transparent sm:w-24 md:w-32" />

        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {t('home.danmaku.loading')}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-slate-300">{t('home.danmaku.loadError')}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className={`${MKT_CTA_ON_DARK_SM} text-indigo-200`}
            >
              {t('home.danmaku.retry')}
            </button>
          </div>
        ) : pool.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {t('home.danmaku.empty')}
          </div>
        ) : (
          <DanmakuMarquee pool={pool} onPoolLow={loadMore} />
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-indigo-950/80"
      />
    </section>
  )
}
