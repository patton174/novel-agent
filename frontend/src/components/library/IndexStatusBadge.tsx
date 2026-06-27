import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const STATUS_ICON: Record<string, string> = {
  indexed: '✓',
  indexing: '⏳',
  failed: '⚠',
  pending: '○',
}

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  pending: 'secondary',
  indexing: 'outline',
  indexed: 'default',
  failed: 'destructive',
}

export function normalizeIndexStatus(status?: string | null): string {
  if (!status) return 'pending'
  if (status === 'ready') return 'indexed'
  return status
}

interface IndexStatusBadgeProps {
  indexStatus?: string | null
  /** Icon only — for compact lists like @ picker */
  compact?: boolean
  className?: string
}

export function IndexStatusBadge({ indexStatus, compact, className }: IndexStatusBadgeProps) {
  const { t } = useTranslation(['dashboard'])
  const status = normalizeIndexStatus(indexStatus)
  const icon = STATUS_ICON[status] ?? '○'
  const label = t(`dashboard:library.indexStatus.${status}`, { defaultValue: status })

  if (compact) {
    return (
      <span
        className={cn('shrink-0 text-xs text-muted-foreground', className)}
        title={label}
        aria-label={label}
      >
        {icon}
      </span>
    )
  }

  const variant = STATUS_VARIANT[status] ?? 'secondary'

  return (
    <Badge
      variant={variant}
      className={cn(
        'shrink-0 text-[10px] font-normal',
        status === 'indexed' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        status === 'indexing' && 'animate-pulse',
        className,
      )}
    >
      {icon} {label}
    </Badge>
  )
}
