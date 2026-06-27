import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSiteContent } from '@/api/billingApi'
import { SiteContentLocaleFallback } from '@/components/content/SiteContentLocaleFallback'
import { SiteMarkdown } from '@/components/content/SiteMarkdown'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface GenericContentPageProps {
  contentKey: 'privacy' | 'terms' | 'contact'
}

export default function GenericContentPage({ contentKey }: GenericContentPageProps) {
  const { t, i18n } = useTranslation('marketing')
  const fallbackTitle = t(`footer.${contentKey}`)
  const [title, setTitle] = useState(fallbackTitle)
  const [bodyMd, setBodyMd] = useState<string | null>(null)
  const [localeResolved, setLocaleResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchSiteContent(contentKey)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setTitle(data.title || fallbackTitle)
          setBodyMd(data.bodyMd)
          setLocaleResolved(Boolean(data.localeResolved))
        } else {
          setBodyMd('')
          setLocaleResolved(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contentKey, fallbackTitle, i18n.language])

  const eyebrow =
    contentKey === 'contact' ? t('generic.eyebrowSupport') : t('generic.eyebrowLegal')
  const subtitle =
    contentKey === 'contact' ? t('generic.subtitleContact') : t('generic.subtitleLegal')

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="light"
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />

      <section className={cn(MKT_SECTION_WRAP, 'pb-24')}>
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className={cn(MKT_SURFACE_CARD_PAD, 'overflow-hidden')}>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="mt-6 h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : bodyMd?.trim() ? (
                <>
                  <SiteContentLocaleFallback localeResolved={localeResolved} className="mb-4" />
                  <SiteMarkdown text={bodyMd} />
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="font-mono text-base font-bold text-foreground">{t('generic.emptyTitle')}</p>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">{t('generic.emptyDesc')}</p>
                </div>
              )}
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  )
}
