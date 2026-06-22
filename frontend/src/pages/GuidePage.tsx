import { Link } from 'react-router-dom'

import { BookOpen, GitBranch, PenLine, Rocket, CheckCircle2 } from 'lucide-react'

import { motion } from 'framer-motion'

import { useTranslation } from 'react-i18next'

import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'

import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'

import { MKT_SECTION_WRAP, MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'

import { cn } from '@/lib/utils'



const STEP_ICONS = [BookOpen, GitBranch, PenLine, Rocket] as const

const SUITABILITY_KEYS = ['1', '2', '3'] as const



export default function GuidePage() {

  const { t } = useTranslation(['marketing', 'common'])

  const steps = [1, 2, 3, 4] as const



  return (

    <MarketingPageLayout subpageCta>

      <MarketingSubpageHero

        variant="light"

        eyebrow={t('guide.eyebrow')}

        title={t('guide.title')}

        subtitle={t('guide.subtitle')}

      />



      <div className={MKT_SECTION_WRAP}>

        <nav className="mb-8 lg:hidden" aria-label={t('guide.toc')}>

          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">

            {t('guide.toc')}

          </p>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">

            {steps.map((n) => (

              <a

                key={n}

                href={`#step-${n}`}

                className="shrink-0 border-2 border-foreground bg-surface px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground shadow-soft transition-colors hover:bg-primary hover:text-white"

              >

                {String(n).padStart(2, '0')}

              </a>

            ))}

          </div>

        </nav>



        <div className={cn(MKT_SURFACE_CARD_PAD, 'mb-8 border-primary/40 bg-primary/5 lg:hidden')}>

          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-primary">

            {t('guide.suitabilityTitle')}

          </p>

          <ul className="space-y-2.5">

            {SUITABILITY_KEYS.map((key) => (

              <li key={key} className="flex gap-2 font-mono text-sm leading-relaxed text-muted-foreground">

                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />

                {t(`guide.suitability.${key}`)}

              </li>

            ))}

          </ul>

        </div>



        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-12">

          <ol className="order-1 min-w-0 space-y-5">

            {steps.map((n, index) => {

              const Icon = STEP_ICONS[index]

              return (

                <motion.li

                  id={`step-${n}`}

                  key={n}

                  initial={{ opacity: 0, y: 24 }}

                  whileInView={{ opacity: 1, y: 0 }}

                  viewport={{ once: true, margin: '-8% 0px' }}

                  transition={{ duration: 0.45, delay: index * 0.05 }}

                  className={cn(MKT_SURFACE_CARD_PAD, 'scroll-mt-20')}

                >

                  <div className="mb-4 flex items-center gap-3">

                    <div className="flex size-11 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-white shadow-soft">

                      <Icon className="size-5" strokeWidth={1.75} />

                    </div>

                    <span className="border-2 border-foreground bg-muted px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums tracking-widest text-muted-foreground">

                      STEP {String(n).padStart(2, '0')}

                    </span>

                  </div>

                  <h2 className="mb-2 font-mono text-lg font-bold uppercase tracking-tight text-foreground md:text-xl">

                    {t(`guide.steps.${n}.title`)}

                  </h2>

                  <p className="font-mono text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">

                    {t(`guide.steps.${n}.desc`)}

                  </p>

                </motion.li>

              )

            })}

          </ol>



          <aside className="order-2 hidden space-y-5 lg:block">

            <div className={cn(MKT_SURFACE_CARD, 'sticky top-24 p-4')}>

              <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">

                {t('guide.toc')}

              </p>

              <nav className="space-y-1">

                {steps.map((n) => (

                  <a

                    key={n}

                    href={`#step-${n}`}

                    className="block border-2 border-transparent px-2 py-1.5 font-mono text-xs leading-snug text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"

                  >

                    <span className="font-bold tabular-nums text-primary">{String(n).padStart(2, '0')}</span>

                    <span className="mx-1.5 text-foreground/30">·</span>

                    {t(`guide.steps.${n}.title`)}

                  </a>

                ))}

              </nav>

            </div>



            <div className={cn(MKT_SURFACE_CARD_PAD, 'sticky top-[22rem] border-primary/40 bg-primary/5')}>

              <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-primary">

                {t('guide.suitabilityTitle')}

              </p>

              <ul className="space-y-2.5">

                {SUITABILITY_KEYS.map((key) => (

                  <li key={key} className="flex gap-2 font-mono text-xs leading-relaxed text-muted-foreground">

                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />

                    {t(`guide.suitability.${key}`)}

                  </li>

                ))}

              </ul>

              <Link

                to="/#feasibility"

                className="mt-4 inline-flex font-mono text-xs font-bold text-primary hover:underline"

              >

                {t('pricing.feasibilityLink')} →

              </Link>

            </div>

          </aside>

        </div>

      </div>

    </MarketingPageLayout>

  )

}


