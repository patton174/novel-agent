import { Link } from 'react-router-dom'
import { Brain, Eye, Shield, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_CTA_PRIMARY, MKT_CTA_SECONDARY } from '@/lib/marketingCta'

const VALUE_ICONS = [Brain, Eye, Shield] as const

export default function AboutPage() {
  const { t } = useTranslation('marketing')
  const values = [1, 2, 3] as const
  const metrics = [
    { label: t('about.metrics.capability'), value: t('about.metrics.capabilityValue') },
    { label: t('about.metrics.stream'), value: t('about.metrics.streamValue') },
    { label: t('about.metrics.memory'), value: t('about.metrics.memoryValue') },
  ]

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="dark"
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        subtitle={t('about.subtitle')}
        action={
          <Link to="/register" className={MKT_CTA_PRIMARY}>
            {t('nav.register')}
            <ArrowRight className="size-4" />
          </Link>
        }
      >
        <dl className="flex flex-wrap gap-6 border-t border-white/10 pt-8 sm:gap-8">
          {metrics.map((m) => (
            <div key={m.label}>
              <dt className="text-xs uppercase tracking-wider text-slate-500">{m.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-indigo-300 md:text-3xl">{m.value}</dd>
            </div>
          ))}
        </dl>
      </MarketingSubpageHero>

      <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <div className="space-y-4">
          {values.map((n, index) => {
            const Icon = VALUE_ICONS[index]
            return (
              <motion.article
                key={n}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="mkt-card-lift grid gap-4 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm md:grid-cols-[3.5rem_1fr] md:p-8"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/5 ring-1 ring-primary/15">
                  <Icon className="size-5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-foreground md:text-xl">
                    {t(`about.values.${n}.title`)}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    {t(`about.values.${n}.desc`)}
                  </p>
                </div>
              </motion.article>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border/60 pt-10">
          <Link to="/pricing" className={MKT_CTA_SECONDARY}>
            {t('nav.pricing')}
          </Link>
          <Link to="/register" className={MKT_CTA_PRIMARY}>
            {t('nav.register')}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </MarketingPageLayout>
  )
}

