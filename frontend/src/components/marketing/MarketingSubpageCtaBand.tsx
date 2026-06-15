import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MKT_CTA_PRIMARY, MKT_CTA_SECONDARY } from '@/lib/marketingCta'
import { MarketingStrokeTitle } from './MarketingStrokeTitle'

/** 营销子页底部转化带（轻量版，补全 linksOnly Footer 的漏斗断裂） */
export function MarketingSubpageCtaBand() {
  const { t } = useTranslation(['marketing', 'common'])

  return (
    <section className="border-t border-border/50 bg-gradient-to-br from-primary/[0.06] via-background to-violet-500/[0.05] px-6 py-12 md:py-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="sr-only">{t('footer.ctaTitle')}</h2>
        <MarketingStrokeTitle text={t('footer.ctaTitle')} size="cta" variant="default" block />
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('footer.ctaDesc')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className={MKT_CTA_PRIMARY}>
            {t('common:cta.registerFree')}
            <ArrowRight className="size-4" />
          </Link>
          <Link to="/login" className={MKT_CTA_SECONDARY}>
            {t('common:cta.login')}
          </Link>
        </div>
      </div>
    </section>
  )
}
