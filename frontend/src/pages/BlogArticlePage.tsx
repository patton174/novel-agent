import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { BlogArticleBody } from '@/components/marketing/BlogArticleBody'
import { getBlogEntry, isBlogSlug } from '@/content/blog/articles'
import { MKT_SECTION_WRAP } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'

export default function BlogArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation(['marketing'])

  if (!isBlogSlug(slug)) {
    return <Navigate to="/blog" replace />
  }

  const entry = getBlogEntry(slug)!
  const locale = i18n.language.startsWith('en') ? 'en-US' : 'zh-CN'
  const baseKey = `blog.articles.${slug}`

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="light"
        eyebrow={t('blog.eyebrow')}
        title={t(`${baseKey}.title`)}
        subtitle={t(`${baseKey}.description`)}
      />

      <section className={cn(MKT_SECTION_WRAP, 'pb-20')}>
        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('blog.backToList')}
          </Link>
          <time
            dateTime={entry.publishedAt}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {t('blog.publishedAt', {
              date: new Date(entry.publishedAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            })}
          </time>
        </div>
        <BlogArticleBody slug={slug} />
      </section>
    </MarketingPageLayout>
  )
}
