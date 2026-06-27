import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import {
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/** Admin 卡片：移动端可折叠，桌面始终展开 */
export function AdminCollapsibleCard({
  title,
  description,
  action,
  defaultMobileOpen = false,
  className,
  bodyClassName,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  defaultMobileOpen?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const { t } = useTranslation('common')
  const isMobile = useAppMobile()
  const [mobileOpen, setMobileOpen] = useState(defaultMobileOpen)
  const expanded = !isMobile || mobileOpen

  return (
    <AppShellCard className={className}>
      <AppShellCardHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-1.5">
            {action ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {action}
              </div>
            ) : null}
            {isMobile ? (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? t('sidebar.collapseShort') : t('sidebar.expandShort')}
                onClick={() => setMobileOpen((open) => !open)}
              >
                <ChevronDown className={cn('size-4 transition-transform', mobileOpen && 'rotate-180')} />
              </button>
            ) : null}
          </div>
        }
      />
      {expanded ? <AppShellCardBody className={bodyClassName}>{children}</AppShellCardBody> : null}
    </AppShellCard>
  )
}
