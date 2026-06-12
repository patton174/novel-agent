import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadNamespace } from '@/i18n'
import { MarketingShell } from './MarketingShell'
import { MarketingNav } from './MarketingNav'
import { HomeFooterSection } from './sections/HomeFooterSection'
import { MarketingMain } from '@/styles/surfaces/marketing'

import { MarketingSubpageCtaBand } from './MarketingSubpageCtaBand'

type FooterVariant = 'full' | 'linksOnly'

export function MarketingPageLayout({
  children,
  footerVariant = 'linksOnly',
  subpageCta = false,
}: {
  children: ReactNode
  footerVariant?: FooterVariant
  /** 子页底部转化带（Guide / Pricing / About 等） */
  subpageCta?: boolean
}) {
  const { i18n } = useTranslation()

  useEffect(() => {
    void loadNamespace('marketing', i18n.language)
  }, [i18n.language])

  return (
    <MarketingShell>
      <MarketingNav />
      <MarketingMain>{children}</MarketingMain>
      {subpageCta ? <MarketingSubpageCtaBand /> : null}
      <HomeFooterSection variant={footerVariant} />
    </MarketingShell>
  )
}
