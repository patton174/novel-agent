import { Link } from 'react-router-dom'
import { Brain, Eye, Shield, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'

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
    <MarketingPageLayout>
      <div className="relative overflow-hidden px-6 pb-24 pt-28">
        <div className="pointer-events-none absolute -right-20 top-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl space-y-20">
          <header className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {t('about.eyebrow')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t('about.title')}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{t('about.subtitle')}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-border/70 bg-surface/90 px-6 py-8 text-center shadow-soft backdrop-blur-sm"
              >
                <p className="text-3xl font-bold tabular-nums tracking-tight text-primary">{m.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {values.map((n, index) => {
              const Icon = VALUE_ICONS[index]
              return (
                <article
                  key={n}
                  className="rounded-2xl border border-border/70 bg-gradient-to-b from-surface to-surface/60 p-7 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-hover"
                >
                  <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/8">
                    <Icon className="size-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-foreground">
                    {t(`about.values.${n}.title`)}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`about.values.${n}.desc`)}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-7 py-3 text-sm font-semibold text-foreground shadow-soft transition hover:border-primary/30"
            >
              {t('nav.pricing')}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              {t('nav.register')}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  )
}
