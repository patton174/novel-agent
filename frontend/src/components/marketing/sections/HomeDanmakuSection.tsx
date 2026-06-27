import { useTranslation } from 'react-i18next'
import { DanmakuMarquee } from '@/components/marketing/danmaku/DanmakuMarquee'
import { useDanmakuFeed } from '@/components/marketing/danmaku/useDanmakuFeed'
import { PixelText } from '@/components/marketing/pixel/PixelText'
import { MKT_CTA_ON_DARK_SM } from '@/lib/marketingCta'

export function HomeDanmakuSection() {
  const { t } = useTranslation('marketing')
  const { pool, loading, error, reload, loadMore } = useDanmakuFeed()

  return (
    <section
      id="voices"
      data-danmaku-section
      className="relative scroll-mt-16 overflow-hidden border-t-2 border-foreground bg-ink pb-6 pt-8 text-white md:pb-10 md:pt-16"
    >
      {/* 小节标签：mono 荧光绿编号 + 标题，粗野主义版头 */}
      <div className="relative z-20 mx-auto mb-2 flex max-w-6xl items-center gap-4 px-6">
        <span className="inline-flex items-center border-2 border-white/40 bg-white/5 px-2 py-1 text-neon">
          <PixelText text={t('home.danmaku.sectionTag')} size="sm" fontWeight={800} />
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-white/50">
          {t('home.danmaku.eyebrow')}
        </span>
      </div>

      {/* 弹幕轨道：与下方像素场同色（墨黑），硬裁切边缘无绿隔离带。
          区域分隔交给像素场顶部的细线（见 HomeFooterSection），此处保持连续暗墙。 */}
      <div className="relative h-[80px] w-full md:h-[100px]">
        {loading ? (
          <div className="flex h-full items-center justify-center font-mono text-sm text-white/70">
            {t('home.danmaku.loading')}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="font-mono text-sm text-white/80">{t('home.danmaku.loadError')}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className={MKT_CTA_ON_DARK_SM}
            >
              {t('home.danmaku.retry')}
            </button>
          </div>
        ) : pool.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-sm text-white/70">
            {t('home.danmaku.empty')}
          </div>
        ) : (
          <DanmakuMarquee pool={pool} onPoolLow={loadMore} />
        )}
      </div>
    </section>
  )
}
