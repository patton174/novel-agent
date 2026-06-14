import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BookMarked, PenTool, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingAmbient } from '../MarketingAmbient'
import { MKT_CTA_PRIMARY, MKT_CTA_SECONDARY } from '@/lib/marketingCta'

const PERSONAS = [
  { key: 'serial', icon: PenTool, accent: 'from-violet-500/20 via-indigo-500/10 to-transparent' },
  { key: 'world', icon: BookMarked, accent: 'from-emerald-500/20 via-teal-500/10 to-transparent' },
  { key: 'edit', icon: Users, accent: 'from-amber-500/20 via-orange-500/10 to-transparent' },
] as const

const COMPARE_KEYS = ['context', 'orchestrate', 'stream', 'resume'] as const

export function HomeFeasibilitySection() {
  const { t } = useTranslation('marketing')
  const reduced = useReducedMotion()

  const fade = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-8% 0px' },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <section
      id="feasibility"
      className="relative scroll-mt-16 overflow-hidden border-t border-border/40 bg-gradient-to-b from-white via-slate-50/80 to-white px-6 py-20 md:py-28"
    >
      <MarketingAmbient variant="subtle" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div {...fade()} className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">
            <Sparkles className="size-3" />
            {t('home.feasibility.eyebrow')}
          </p>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-4xl">
            {t('home.feasibility.title')}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{t('home.feasibility.subtitle')}</p>
        </motion.div>

        <div className="mb-14 grid gap-5 md:grid-cols-3 md:gap-6">
          {PERSONAS.map(({ key, icon: Icon, accent }, i) => (
            <motion.article
              key={key}
              {...fade(i * 0.07)}
              className={`group mkt-card-lift relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${accent} p-6 shadow-[0_8px_32px_-12px_rgba(79,70,229,0.12)]`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/40 blur-2xl transition-opacity group-hover:opacity-100 opacity-60"
              />
              <div className="relative mb-4 flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-border/50">
                  <Icon className="size-5 text-primary" strokeWidth={1.75} />
                </div>
                <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  {t(`home.feasibility.personas.${key}.fit`)}
                </span>
              </div>
              <h3 className="relative mb-2 text-lg font-semibold text-foreground">
                {t(`home.feasibility.personas.${key}.title`)}
              </h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {t(`home.feasibility.personas.${key}.desc`)}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          {...fade(0.08)}
          className="mb-10 overflow-hidden rounded-2xl border border-border/70 bg-white/80 shadow-[0_16px_48px_-20px_rgba(79,70,229,0.15)] backdrop-blur-sm"
        >
          <div className="border-b border-border/60 bg-gradient-to-r from-primary/[0.04] to-transparent px-5 py-4 md:px-6">
            <h3 className="text-sm font-semibold text-foreground">{t('home.feasibility.compareTitle')}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground md:hidden">← 左右滑动查看更多 →</p>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold md:px-6">{t('home.feasibility.compareHeaders.feature')}</th>
                  <th className="px-5 py-3 font-semibold md:px-6">{t('home.feasibility.compareHeaders.generic')}</th>
                  <th className="bg-primary/[0.06] px-5 py-3 font-semibold text-primary md:px-6">
                    {t('home.feasibility.compareHeaders.us')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_KEYS.map((rowKey) => (
                  <tr key={rowKey} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-foreground md:px-6">
                      {t(`home.feasibility.compareRows.${rowKey}.feature`)}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground md:px-6">
                      {t(`home.feasibility.compareRows.${rowKey}.generic`)}
                    </td>
                    <td className="bg-primary/[0.04] px-5 py-3.5 font-semibold text-foreground md:px-6">
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
            <ArrowRight className="size-4" />
          </Link>
          <Link to="/pricing" className={MKT_CTA_SECONDARY}>
            {t('home.feasibility.ctaPricing')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

