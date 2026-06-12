import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadNamespace } from '@/i18n'
import { MarketingShell } from './MarketingShell'
import { MarketingNav } from './MarketingNav'
import { HomeFooterSection } from './sections/HomeFooterSection'
import { MarketingMain } from '@/styles/surfaces/marketing'

export function MarketingPageLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    void loadNamespace('marketing', i18n.language)
  }, [i18n.language])

  return (
    <MarketingShell>
      <MarketingNav />
      <MarketingMain>{children}</MarketingMain>
      <HomeFooterSection />
    </MarketingShell>
  )
}
