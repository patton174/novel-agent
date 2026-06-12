import { Link } from 'react-router-dom'
import {
  BookOpen,
  GitBranch,
  PenLine,
  Rocket,
  ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'

const STEP_ICONS = [BookOpen, GitBranch, PenLine, Rocket] as const

export default function GuidePage() {
  const { t } = useTranslation('marketing')

  const steps = [1, 2, 3, 4] as const

  return (
    <MarketingPageLayout>
      <div className="relative overflow-hidden px-6 pb-24 pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

        <div className="relative mx-auto max-w-4xl space-y-16">
          <header className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {t('guide.eyebrow')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t('guide.title')}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t('guide.subtitle')}
            </p>
          </header>

          <ol className="relative space-y-0">
            <div
              aria-hidden
              className="absolute bottom-4 left-8 top-4 hidden w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:block"
            />
            {steps.map((n, index) => {
              const Icon = STEP_ICONS[index]
              return (
                <li
                  key={n}
                  className="group relative grid gap-6 pb-12 md:grid-cols-[4rem_1fr] md:gap-10"
                >
                  <div className="relative z-10 flex md:justify-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 to-indigo-500/5 shadow-soft transition-all duration-500 group-hover:scale-105 group-hover:border-primary/30 group-hover:shadow-hover">
                      <Icon className="size-7 text-primary" strokeWidth={1.75} />
                    </div>
                  </div>
                  <article className="rounded-2xl border border-border/70 bg-surface/90 p-8 shadow-soft backdrop-blur-sm transition-all duration-500 group-hover:-translate-y-0.5 group-hover:border-primary/20 group-hover:shadow-hover">
                    <span className="mb-3 inline-block text-[11px] font-semibold tabular-nums tracking-widest text-primary/70">
                      STEP {String(n).padStart(2, '0')}
                    </span>
                    <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
                      {t(`guide.steps.${n}.title`)}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`guide.steps.${n}.desc`)}
                    </p>
                  </article>
                </li>
              )
            })}
          </ol>

          <div className="flex justify-center pt-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl"
            >
              {t('guide.cta')}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  )
}
