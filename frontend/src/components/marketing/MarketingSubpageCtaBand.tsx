import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'
import { PixelText } from './pixel/PixelText'

/** 营销子页底部转化带：与首页一致的像素 Neo-Brutalism */
export function MarketingSubpageCtaBand() {
  const { t } = useTranslation(['marketing', 'common'])

  return (
    <section className="pixel-grid-bg-faint border-t-2 border-foreground bg-background px-4 py-12 sm:px-6 md:py-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="sr-only">{t('footer.ctaTitle')}</h2>
        <div className="w-full max-w-xl">
          <PixelText
            text={t('footer.ctaTitle')}
            cell={16}
            fill
            fillFit
            dotRange={[1.1, 2.2]}
            fontWeight={900}
            className="text-ink"
          />
        </div>
        <p className="max-w-lg font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('footer.ctaDesc')}
        </p>
        <Link to="/register" className={MKT_CTA_PRIMARY}>
          {t('common:cta.startCreating')}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
