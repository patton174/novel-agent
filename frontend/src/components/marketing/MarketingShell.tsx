import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadNamespace } from '@/i18n'
import {
  MARKETING_BACKGROUND_PATTERN,
  MARKETING_PAGE_WRAPPER,
} from '@/lib/marketingShellClasses'
import { MarketingScrollProvider } from './MarketingScrollProvider'

export function MarketingShell({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    void loadNamespace('marketing', i18n.language)
  }, [i18n.language])

  return (
    <div className={MARKETING_PAGE_WRAPPER}>
      <MarketingScrollProvider>
        <div className={MARKETING_BACKGROUND_PATTERN} data-hero-pattern />
        {/* Cursor 风落地页：去掉彩色光斑，保持干净底色 */}
        {children}
      </MarketingScrollProvider>
    </div>
  )
}
