import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadNamespace } from '@/i18n'
import { MarketingBackgroundPattern, MarketingPageWrapper } from '../../styles/surfaces/marketing'
import { MarketingScrollProvider } from './MarketingScrollProvider'

export function MarketingShell({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    void loadNamespace('marketing', i18n.language)
  }, [i18n.language])

  return (
    <MarketingPageWrapper>
      <MarketingScrollProvider>
        <MarketingBackgroundPattern data-hero-pattern />
        {/* Cursor 风落地页：去掉彩色光斑，保持干净底色 */}
        {children}
      </MarketingScrollProvider>
    </MarketingPageWrapper>
  )
}
