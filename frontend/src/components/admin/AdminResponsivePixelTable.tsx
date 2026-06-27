import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PixelTable, type PixelTableProps } from '@/components/pixel'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

function resolveRowKey<T>(
  row: T,
  rowKey: PixelTableProps<T>['rowKey'],
  index: number,
): string | number {
  if (typeof rowKey === 'function') return rowKey(row)
  const value = row[rowKey as keyof T]
  return value != null ? String(value) : index
}

export interface AdminResponsivePixelTableProps<T>
  extends Omit<PixelTableProps<T>, 'data' | 'loading'> {
  data: T[]
  loading?: boolean
  /** 首次加载（尚无 data）时展示骨架 */
  initialLoading?: boolean
  initialSkeletonClassName?: string
  renderMobileCard: (row: T, index: number) => ReactNode
  mobileLoadingCount?: number
  mobileListClassName?: string
  renderMobileEmpty?: ReactNode
}

/** 管理台表格：桌面 PixelTable，移动像素卡片列表 */
export function AdminResponsivePixelTable<T>({
  data,
  loading = false,
  initialLoading = false,
  initialSkeletonClassName = 'm-3 h-48 rounded-lg',
  renderMobileCard,
  mobileLoadingCount = 4,
  mobileListClassName,
  renderMobileEmpty,
  emptyText,
  skeletonRows = 8,
  className,
  ...tableProps
}: AdminResponsivePixelTableProps<T>) {
  const { t } = useTranslation('common')
  const resolvedEmptyText = emptyText ?? t('table.empty')
  const isMobile = useAppMobile()

  if (initialLoading) {
    return <Skeleton className={initialSkeletonClassName} />
  }

  if (isMobile) {
    return (
      <div className={cn('space-y-3 p-3', mobileListClassName)}>
        {loading
          ? Array.from({ length: mobileLoadingCount }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-24 w-full rounded-lg border border-[var(--pixel-border)]"
              />
            ))
          : data.length === 0
            ? (renderMobileEmpty ?? (
                <p className="py-10 text-center font-mono text-sm text-muted-foreground">{resolvedEmptyText}</p>
              ))
            : data.map((row, index) => (
                <div key={resolveRowKey(row, tableProps.rowKey, index)}>
                  {renderMobileCard(row, index)}
                </div>
              ))}
      </div>
    )
  }

  return (
    <PixelTable
      {...tableProps}
      data={data}
      loading={loading}
      skeletonRows={skeletonRows}
      emptyText={resolvedEmptyText}
      className={className}
    />
  )
}
