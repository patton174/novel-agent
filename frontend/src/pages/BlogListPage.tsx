import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { BLOG_CATALOG, blogArticlePath } from '@/content/blog/articles'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'

export default function BlogListPage() {
  const { t, i18n } = useTranslation(['marketing'])
  const locale = i18n.language.startsWith('en') ? 'en-US' : 'zh-CN'

  const sorted = [...BLOG_CATALOG].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="soft"
        eyebrow={t('blog.eyebrow')}
        title={t('blog.listTitle')}
        subtitle={t('blog.listSubtitle')}
      />

      <section className={cn(MKT_SECTION_WRAP, 'pb-20')}>
        <ul className="mx-auto grid max-w-4xl gap-4">
          {sorted.map((entry) => {
            const key = `blog.articles.${entry.slug}`
            return (
              <li key={entry.slug}>
                <Link
                  to={blogArticlePath(entry.slug)}
                  className={cn(
                    MKT_SURFACE_CARD,
                    MKT_SURFACE_CARD_PAD,
                    'group block transition-transform hover:-translate-y-0.5',
                  )}
                >
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
                  <h2 className="mt-2 font-mono text-lg font-bold uppercase tracking-wide group-hover:text-primary">
                    {t(`${key}.title`)}
                  </h2>
                  <p className="mt-2 font-mono text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}.excerpt`)}
                  </p>
                  <span className="mt-3 inline-block font-mono text-xs font-bold uppercase tracking-wide text-primary">
                    {t('blog.readMore')} →
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </MarketingPageLayout>
  )
}
