import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSiteContent } from '@/api/billingApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface GenericContentPageProps {
  contentKey: string
  fallbackTitle: string
}

export default function GenericContentPage({ contentKey, fallbackTitle }: GenericContentPageProps) {
  const { t } = useTranslation('marketing')
  const [title, setTitle] = useState(fallbackTitle)
  const [bodyMd, setBodyMd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchSiteContent(contentKey)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setTitle(data.title || fallbackTitle)
          setBodyMd(data.bodyMd)
        } else {
          setBodyMd('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contentKey, fallbackTitle])

  const eyebrow =
    contentKey === 'contact' ? t('generic.eyebrowSupport') : t('generic.eyebrowLegal')
  const subtitle =
    contentKey === 'contact' ? t('generic.subtitleContact') : t('generic.subtitleLegal')

  return (
    <MarketingPageLayout>
      <MarketingSubpageHero
        variant="soft"
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />

      <section className="relative px-6 pb-24">
        <div className="relative z-10 mx-auto max-w-3xl pt-4 md:pt-6">
          <div
            className={cn(
              'overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-soft',
              'ring-1 ring-black/[0.03] dark:ring-white/[0.04]',
            )}
          >
            <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-violet-500/60" />
            <div className="px-6 py-8 md:px-10 md:py-12">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="mt-6 h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : bodyMd?.trim() ? (
                <article
                  className={cn(
                    'prose prose-slate max-w-none dark:prose-invert',
                    'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
                    'prose-p:leading-relaxed prose-p:text-muted-foreground',
                    'prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                    'prose-li:text-muted-foreground prose-strong:text-foreground',
                  )}
                >
                  <AgentMarkdown text={bodyMd} variant="memory" />
                </article>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-base font-medium text-foreground">{t('generic.emptyTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t('generic.emptyDesc')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  )
}
