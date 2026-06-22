import { Link } from 'react-router-dom'
import { Brain, Eye, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'
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
        variant="light"
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        subtitle={t('about.subtitle')}
      >
        <dl className="mx-auto flex max-w-2xl flex-wrap justify-center gap-6 border-t-2 border-foreground/25 pt-6 sm:gap-8">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-[7rem] text-center sm:text-left">
              <dt className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-bold tabular-nums text-primary md:text-3xl">{m.value}</dd>
            </div>
          ))}
        </dl>
      </MarketingSubpageHero>

      <section className={MKT_SECTION_WRAP}>
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
                className={cn(MKT_SURFACE_CARD_PAD, 'flex h-full flex-col')}
              >
                <div className="mb-4 flex size-12 items-center justify-center border-2 border-foreground bg-primary text-white">
                  <Icon className="size-5" strokeWidth={1.75} />
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

        <div className="mt-12 flex justify-center border-t-2 border-foreground/20 pt-10">
          <Link to="/pricing" className={MKT_CTA_SECONDARY}>
            {t('nav.pricing')}
          </Link>
        </div>
      </section>
    </MarketingPageLayout>
  )
}
