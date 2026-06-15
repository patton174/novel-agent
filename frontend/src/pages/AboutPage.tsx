import { Link } from 'react-router-dom'
import { Brain, Eye, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_CTA_SECONDARY } from '@/lib/marketingCta'

const VALUE_ICONS = [Brain, Eye, Shield] as const

export default function AboutPage() {
  const { t } = useTranslation(['marketing', 'common'])
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
      >
        <dl className="mx-auto flex max-w-2xl flex-wrap justify-center gap-8 border-t border-white/10 pt-8 sm:gap-10">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-[7rem] text-center sm:text-left">
              <dt className="text-xs uppercase tracking-wider text-slate-500">{m.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-indigo-300 md:text-3xl">{m.value}</dd>
            </div>
          ))}
        </dl>
      </MarketingSubpageHero>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          {values.map((n, index) => {
            const Icon = VALUE_ICONS[index]
            return (
              <motion.article
                key={n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="mkt-card-lift flex h-full flex-col rounded-2xl border border-border/60 bg-surface/80 p-6 shadow-sm backdrop-blur-sm md:p-7"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/5 ring-1 ring-primary/15">
                  <Icon className="size-5 text-primary" strokeWidth={1.75} />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground md:text-xl">
                  {t(`about.values.${n}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {t(`about.values.${n}.desc`)}
                </p>
              </motion.article>
            )
          })}
        </div>

        <div className="mt-12 flex justify-center border-t border-border/60 pt-10">
          <Link to="/pricing" className={MKT_CTA_SECONDARY}>
            {t('nav.pricing')}
          </Link>
        </div>
      </section>
    </MarketingPageLayout>
  )
}
