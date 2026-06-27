import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function SiteContentLocaleFallback({
  localeResolved,
  className,
}: {
  localeResolved?: boolean
  className?: string
}) {
  const { t } = useTranslation('common')
  if (!localeResolved) return null
  return (
    <p className={cn('text-xs text-muted-foreground', className)} role="status">
      {t('content.localeFallback')}
    </p>
  )
}
