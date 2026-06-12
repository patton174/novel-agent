import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadNamespace } from '@/i18n'
import { MarketingShell } from './MarketingShell'
import { MarketingNav } from './MarketingNav'
import { HomeFooterSection } from './sections/HomeFooterSection'
import { MarketingMain } from '@/styles/surfaces/marketing'

type FooterVariant = 'full' | 'linksOnly'

export function MarketingPageLayout({
  children,
  footerVariant = 'linksOnly',
}: {
  children: ReactNode
  footerVariant?: FooterVariant
}) {
  const { i18n } = useTranslation()

  useEffect(() => {
    void loadNamespace('marketing', i18n.language)
  }, [i18n.language])

  return (
    <MarketingShell>
      <MarketingNav />
      <MarketingMain>{children}</MarketingMain>
      <HomeFooterSection variant={footerVariant} />
    </MarketingShell>
  )
}
