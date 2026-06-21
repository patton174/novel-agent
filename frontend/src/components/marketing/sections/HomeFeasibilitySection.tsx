import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BookMarked, PenTool, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { MarketingAmbient } from '../MarketingAmbient'
import { PixelText } from '../pixel/PixelText'
import { MKT_CTA_PRIMARY, MKT_CTA_SECONDARY } from '@/lib/marketingCta'
import { marketingInViewMotion } from '../motion/marketingInViewMotion'

const PERSONAS = [
  { key: 'serial', icon: PenTool },
  { key: 'world', icon: BookMarked },
  { key: 'edit', icon: Users },
] as const

const COMPARE_KEYS = ['context', 'orchestrate', 'stream', 'resume'] as const

export function HomeFeasibilitySection() {
  const { t } = useTranslation('marketing')
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()

  const fade = (delay = 0) =>
    marketingInViewMotion({
      isMobile,
      reduced: Boolean(reduced),
      desktopInitial: { opacity: 0, y: 24 },
      desktopWhileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: '-8% 0px' },
      transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
    })

  return (
    <section
      id="feasibility"
      className="relative scroll-mt-16 overflow-hidden border-t-2 border-foreground bg-background px-6 py-24 md:py-32"
    >
      <MarketingAmbient variant="subtle" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div {...fade()} className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <p className="mb-4 inline-flex items-center gap-2 border-2 border-foreground bg-neon px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-soft">
            <Sparkles className="size-3" strokeWidth={2.5} />
            {t('home.feasibility.eyebrow')}
          </p>
          <h2 className="sr-only">{t('home.feasibility.title')}</h2>
          <PixelText
            text={t('home.feasibility.title')}
            cell={20}
            fill
            dotRange={[1.5, 3.5]}
            fontWeight={900}
            className="mb-4 text-ink"
          />
          <p className="font-mono text-base leading-relaxed text-muted-foreground md:text-lg">{t('home.feasibility.subtitle')}</p>
        </motion.div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {PERSONAS.map(({ key, icon: Icon }, i) => (
            <motion.article
              key={key}
              {...fade(i * 0.07)}
              className="group mkt-card-lift relative border-2 border-foreground bg-surface p-6 shadow-soft"
            >
              <div className="relative mb-5 flex items-center justify-between">
                <div className="flex size-12 items-center justify-center border-2 border-foreground bg-primary text-white">
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <span className="border-2 border-ink bg-ink px-2.5 py-0.5 font-mono text-ui-sm font-bold text-neon">
                  {t(`home.feasibility.personas.${key}.fit`)}
                </span>
              </div>
              <h3 className="relative mb-2 text-xl font-black uppercase tracking-tight text-foreground">
                {t(`home.feasibility.personas.${key}.title`)}
              </h3>
              <p className="relative font-mono text-sm leading-relaxed text-muted-foreground">
                {t(`home.feasibility.personas.${key}.desc`)}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          {...fade(0.08)}
          className="mb-12 border-2 border-foreground bg-surface shadow-soft"
        >
          <div className="border-b-2 border-ink bg-ink px-5 py-4 md:px-6">
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-neon">{t('home.feasibility.compareTitle')}</h3>
          </div>

          {/* 移动端：卡片式对比 */}
          <div className="divide-y-2 divide-foreground/20 md:hidden">
            {COMPARE_KEYS.map((rowKey) => (
              <article key={rowKey} className="space-y-3 px-5 py-4">
                <h4 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
                  {t(`home.feasibility.compareRows.${rowKey}.feature`)}
                </h4>
                <div className="grid gap-2">
                  <div className="border-2 border-foreground/30 bg-muted px-3 py-2.5">
                    <p className="mb-1 font-mono text-ui-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('home.feasibility.compareHeaders.generic')}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {t(`home.feasibility.compareRows.${rowKey}.generic`)}
                    </p>
                  </div>
                  <div className="border-2 border-foreground bg-neon px-3 py-2.5">
                    <p className="mb-1 font-mono text-ui-xs font-bold uppercase tracking-wider text-ink">
                      {t('home.feasibility.compareHeaders.us')}
                    </p>
                    <p className="font-mono text-sm font-bold text-ink">
                      {t(`home.feasibility.compareRows.${rowKey}.us`)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* 桌面端：表格 */}
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-foreground font-mono text-xs uppercase tracking-widest">
                  <th className="px-6 py-3 font-bold text-foreground">{t('home.feasibility.compareHeaders.feature')}</th>
                  <th className="px-6 py-3 font-bold text-muted-foreground">{t('home.feasibility.compareHeaders.generic')}</th>
                  <th className="bg-neon px-6 py-3 font-bold text-ink">
                    {t('home.feasibility.compareHeaders.us')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_KEYS.map((rowKey) => (
                  <tr key={rowKey} className="border-b border-foreground/20 last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      {t(`home.feasibility.compareRows.${rowKey}.feature`)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {t(`home.feasibility.compareRows.${rowKey}.generic`)}
                    </td>
                    <td className="bg-neon/20 px-6 py-3.5 font-bold text-ink">
                      {t(`home.feasibility.compareRows.${rowKey}.us`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div {...fade(0.12)} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/guide" className={MKT_CTA_PRIMARY}>
            {t('home.feasibility.ctaGuide')}
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
          <Link to="/pricing" className={MKT_CTA_SECONDARY}>
            {t('home.feasibility.ctaPricing')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

