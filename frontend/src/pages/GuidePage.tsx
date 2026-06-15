import { Link } from 'react-router-dom'
import { BookOpen, GitBranch, PenLine, Rocket, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'

const STEP_ICONS = [BookOpen, GitBranch, PenLine, Rocket] as const
const SUITABILITY_KEYS = ['1', '2', '3'] as const

export default function GuidePage() {
  const { t } = useTranslation(['marketing', 'common'])
  const steps = [1, 2, 3, 4] as const

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="soft"
        eyebrow={t('guide.eyebrow')}
        title={t('guide.title')}
        subtitle={t('guide.subtitle')}
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* 移动端：步骤导航横滑，置于正文之前 */}
        <nav className="mb-8 lg:hidden" aria-label={t('guide.toc')}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('guide.toc')}
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {steps.map((n) => (
              <a
                key={n}
                href={`#step-${n}`}
                className="shrink-0 rounded-xl border border-border/70 bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
              >
                {String(n).padStart(2, '0')} · {t(`guide.steps.${n}.title`)}
              </a>
            ))}
          </div>
        </nav>

        {/* 移动端：适合谁 — 置于步骤正文之前 */}
        <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-violet-500/[0.04] p-5 shadow-[0_12px_40px_-16px_rgba(79,70,229,0.2)] lg:hidden">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
            {t('guide.suitabilityTitle')}
          </p>
          <ul className="space-y-2.5">
            {SUITABILITY_KEYS.map((key) => (
              <li key={key} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/80" />
                {t(`guide.suitability.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="order-3 hidden space-y-8 lg:block">
            <nav className="hidden lg:block">
              <div className="sticky top-28 space-y-1 rounded-2xl border border-border/60 bg-surface/80 p-4 shadow-sm backdrop-blur-sm">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('guide.toc')}
                </p>
                {steps.map((n) => (
                  <a
                    key={n}
                    href={`#step-${n}`}
                    className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {String(n).padStart(2, '0')} · {t(`guide.steps.${n}.title`)}
                  </a>
                ))}
              </div>
            </nav>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-violet-500/[0.04] p-5 shadow-[0_12px_40px_-16px_rgba(79,70,229,0.2)] lg:sticky lg:top-[22rem]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                {t('guide.suitabilityTitle')}
              </p>
              <ul className="space-y-2.5">
                {SUITABILITY_KEYS.map((key) => (
                  <li key={key} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/80" />
                    {t(`guide.suitability.${key}`)}
                  </li>
                ))}
              </ul>
              <Link
                to="/#feasibility"
                className="mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                {t('pricing.feasibilityLink')} →
              </Link>
            </div>
          </aside>

          <ol className="order-2 space-y-6 lg:order-none">
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
                  className="mkt-card-lift scroll-mt-16 rounded-2xl border border-border/70 bg-surface/90 p-6 shadow-[0_8px_32px_-12px_rgba(var(--primary-rgb),0.1)] backdrop-blur-sm md:p-8"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/5 ring-1 ring-primary/15">
                      <Icon className="size-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <span className="rounded-xl bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums tracking-widest text-muted-foreground">
                      STEP {String(n).padStart(2, '0')}
                    </span>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {t(`guide.steps.${n}.title`)}
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {t(`guide.steps.${n}.desc`)}
                  </p>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </div>
    </MarketingPageLayout>
  )
}

