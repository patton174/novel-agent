import { useTranslation } from 'react-i18next'
import { DanmakuMarquee } from '@/components/marketing/danmaku/DanmakuMarquee'
import { useDanmakuFeed } from '@/components/marketing/danmaku/useDanmakuFeed'
import { MKT_CTA_ON_DARK_SM } from '@/lib/marketingCta'

export function HomeDanmakuSection() {
  const { t } = useTranslation('marketing')
  const { pool, loading, error, reload, loadMore } = useDanmakuFeed()

  return (
    <section
      id="voices"
      className="relative scroll-mt-16 overflow-hidden bg-marketing-dark pb-0 pt-16 text-white md:pt-20"
    >
      <div className="mkt-starfield pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(99,102,241,0.28),transparent_55%)]" />

      <div className="relative h-[200px] w-full md:h-[228px]">
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
        className="pointer-events-none h-24 w-full bg-gradient-to-b from-marketing-dark via-[#1e1b4b] to-[#4338ca] md:h-28"
      />
    </section>
  )
}
