import type { ReactNode } from 'react'
import { MarketingBackgroundPattern, MarketingPageWrapper } from '../../styles/surfaces/marketing'
import { MarketingScrollProvider } from './MarketingScrollProvider'

export function MarketingShell({ children }: { children: ReactNode }) {
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
