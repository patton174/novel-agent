import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'
import { MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'

interface ArticleSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

interface BlogArticleBodyProps {
  slug: string
}

export function BlogArticleBody({ slug }: BlogArticleBodyProps) {
  const { t } = useTranslation(['marketing'])
  const baseKey = `blog.articles.${slug}`
  const sections = t(`${baseKey}.sections`, { returnObjects: true }) as ArticleSection[]

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <p className="font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
        {t(`${baseKey}.lead`)}
      </p>

      {Array.isArray(sections)
        ? sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="font-mono text-sm leading-relaxed text-muted-foreground md:text-base"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="list-disc space-y-2 pl-5 font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
                  {section.bullets.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))
        : null}

      <aside
        className={cn(
          MKT_SURFACE_CARD,
          MKT_SURFACE_CARD_PAD,
          'space-y-3 border-l-4 border-l-primary bg-neon/10',
        )}
      >
        <h2 className="font-mono text-base font-bold uppercase tracking-wide">
          {t(`${baseKey}.ctaTitle`)}
        </h2>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          {t(`${baseKey}.ctaBody`)}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/compare" className={cn(MKT_CTA_PRIMARY, 'inline-flex px-5 py-2.5 text-sm')}>
            {t('blog.compareCta')}
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center border-2 border-foreground bg-background px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wide shadow-soft transition-all hover:bg-neon"
          >
            {t('blog.registerCta')}
          </Link>
        </div>
      </aside>
    </article>
  )
}
