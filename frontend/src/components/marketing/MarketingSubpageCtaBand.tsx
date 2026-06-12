import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** 营销子页底部转化带（轻量版，补全 linksOnly Footer 的漏斗断裂） */
export function MarketingSubpageCtaBand() {
  const { t } = useTranslation('marketing')

  return (
    <section className="border-t border-border/50 bg-gradient-to-br from-primary/[0.05] via-white to-violet-500/[0.06] px-6 py-12 md:py-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {t('footer.ctaTitle')}
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('footer.ctaDesc')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/register"
            className="mkt-cta-glow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            {t('footer.ctaRegister')}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white/80 px-6 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/30"
          >
            {t('footer.ctaLogin')}
          </Link>
        </div>
      </div>
    </section>
  )
}
