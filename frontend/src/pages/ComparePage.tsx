import { Link } from 'react-router-dom'
import { Check, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'

const COMPETITOR_IDS = ['moyan', 'wawa', 'waqu', 'yuewen', 'general'] as const
type CompetitorId = (typeof COMPETITOR_IDS)[number]

const FEATURE_KEYS = ['focus', 'memory', 'agent', 'online', 'bestFor'] as const

function CellValue({ value }: { value: string }) {
  if (value === 'yes') {
    return <Check className="mx-auto h-5 w-5 text-emerald-600" aria-label="yes" />
  }
  if (value === 'partial') {
    return <Minus className="mx-auto h-5 w-5 text-amber-600" aria-label="partial" />
  }
  if (value === 'no') {
    return <Minus className="mx-auto h-5 w-5 text-muted-foreground" aria-label="no" />
  }
  return <span className="font-mono text-xs leading-relaxed text-foreground md:text-sm">{value}</span>
}

export default function ComparePage() {
  const { t } = useTranslation(['marketing'])

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="soft"
        eyebrow={t('compare.eyebrow')}
        title={t('compare.title')}
        subtitle={t('compare.subtitle')}
      />

      <section className={cn(MKT_SECTION_WRAP, 'pb-8')}>
        <p className="mx-auto max-w-3xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('compare.intro')}
        </p>
      </section>

      <section className={cn(MKT_SECTION_WRAP, 'pb-12')}>
        <div className="overflow-x-auto">
          <table className={cn(MKT_SURFACE_CARD, 'w-full min-w-[720px] border-collapse text-left')}>
            <caption className="sr-only">{t('compare.tableCaption')}</caption>
            <thead>
              <tr className="border-b-2 border-foreground bg-muted/40">
                <th scope="col" className={cn(MKT_SURFACE_CARD_PAD, 'font-mono text-xs uppercase tracking-wide')}>
                  {t('compare.table.product')}
                </th>
                {FEATURE_KEYS.map((key) => (
                  <th
                    key={key}
                    scope="col"
                    className={cn(MKT_SURFACE_CARD_PAD, 'font-mono text-xs uppercase tracking-wide text-center')}
                  >
                    {t(`compare.table.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITOR_IDS.map((id: CompetitorId) => {
                const highlight = id === 'moyan'
                return (
                  <tr
                    key={id}
                    id={`compare-${id}`}
                    className={cn(
                      'border-b border-foreground/10',
                      highlight && 'bg-neon/10',
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(MKT_SURFACE_CARD_PAD, 'align-top font-mono text-sm font-bold')}
                    >
                      <div>{t(`compare.rows.${id}.name`)}</div>
                      {highlight ? (
                        <span className="mt-1 inline-block rounded border border-foreground px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                          {t('compare.ourProduct')}
                        </span>
                      ) : null}
                    </th>
                    {FEATURE_KEYS.map((key) => (
                      <td key={key} className={cn(MKT_SURFACE_CARD_PAD, 'align-top text-center')}>
                        <CellValue value={t(`compare.rows.${id}.${key}`)} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">{t('compare.disclaimer')}</p>
      </section>

      <section className={cn(MKT_SECTION_WRAP, 'pb-20')}>
        <div className={cn(MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD, 'mx-auto max-w-3xl space-y-4 text-center')}>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide">{t('compare.pickTitle')}</h2>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">{t('compare.pickBody')}</p>
          <Link to="/register" className={cn(MKT_CTA_PRIMARY, 'inline-flex px-6 py-3 text-sm')}>
            {t('compare.cta')}
          </Link>
        </div>
      </section>
    </MarketingPageLayout>
  )
}
