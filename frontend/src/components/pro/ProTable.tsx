import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  PIXEL_TABLE_BODY_ROW,
  PIXEL_TABLE_CELL,
  PIXEL_TABLE_COMPACT_BODY_ROW,
  PIXEL_TABLE_COMPACT_CELL,
  PIXEL_TABLE_COMPACT_EMPTY,
  PIXEL_TABLE_COMPACT_HEAD_CELL,
  PIXEL_TABLE_COMPACT_HEAD_ROW,
  PIXEL_TABLE_COMPACT_WRAP,
  PIXEL_TABLE_EMPTY,
  PIXEL_TABLE_HEAD_CELL,
  PIXEL_TABLE_HEAD_ROW,
  PIXEL_TABLE_WRAP,
} from '@/components/pixel/pixelTokens'

export interface ProColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export interface ProTableProps<T> {
  columns: ProColumn<T>[]
  data: T[]
  rowKey: keyof T | ((row: T) => string | number)
  loading?: boolean
  skeletonRows?: number
  emptyText?: string
  onRowClick?: (row: T) => void
  className?: string
  /** 管理后台表格：更小行高与轻边框 */
  dense?: boolean
  /** 嵌入 AdminDataPanel 时去掉外边框，避免嵌套双边框 */
  embedded?: boolean
  /** pixel：清爽多彩管理台皮肤；pro：默认硬边表格 */
  skin?: 'pro' | 'pixel'
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function ProTable<T>({
  columns,
  data,
  rowKey,
  loading,
  skeletonRows = 5,
  emptyText,
  onRowClick,
  className,
  dense = false,
  embedded = false,
  skin = 'pro',
}: ProTableProps<T>) {
  const { t } = useTranslation('common')
  const resolvedEmptyText = emptyText ?? t('table.empty')
  const isPixel = skin === 'pixel'
  const getKey = (row: T, i: number) =>
    typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey as keyof T] ?? i)

  const wrapClass = embedded
    ? 'w-full overflow-x-auto bg-transparent'
    : isPixel
      ? dense
        ? PIXEL_TABLE_COMPACT_WRAP
        : PIXEL_TABLE_WRAP
      : dense
        ? 'rounded-lg border border-border'
        : 'border-2 border-black'

  const headRowClass = isPixel
    ? dense
      ? PIXEL_TABLE_COMPACT_HEAD_ROW
      : PIXEL_TABLE_HEAD_ROW
    : dense
      ? 'border-b border-border bg-muted/40 text-muted-foreground'
      : 'border-b-2 border-black bg-ink text-surface'

  const headCellClass = isPixel
    ? dense
      ? PIXEL_TABLE_COMPACT_HEAD_CELL
      : PIXEL_TABLE_HEAD_CELL
    : dense
      ? 'h-9 px-4 text-left text-xs font-medium uppercase tracking-wide'
      : 'h-12 px-4 font-mono text-xs font-bold uppercase tracking-widest text-surface'

  const bodyRowBase = isPixel
    ? dense
      ? PIXEL_TABLE_COMPACT_BODY_ROW
      : PIXEL_TABLE_BODY_ROW
    : dense
      ? 'border-b border-border hover:bg-muted/30'
      : 'border-b border-black/30 hover:bg-neon'

  const skeletonRowClass = isPixel
    ? dense
      ? 'border-b border-border/50'
      : 'border-b border-border/40'
    : dense
      ? 'border-b border-border'
      : 'border-b border-black/30'

  const cellClass = isPixel
    ? dense
      ? PIXEL_TABLE_COMPACT_CELL
      : PIXEL_TABLE_CELL
    : dense
      ? 'px-4 py-2.5 text-sm text-foreground'
      : 'px-4 py-4 text-sm font-medium text-ink'

  const skeletonCellPad = isPixel ? (dense ? 'px-3 py-2' : 'px-4 py-2.5') : dense ? 'px-4 py-2.5' : 'px-4 py-4'

  const emptyCellClass = isPixel
    ? dense
      ? PIXEL_TABLE_COMPACT_EMPTY
      : PIXEL_TABLE_EMPTY
    : dense
      ? 'py-10 text-sm'
      : 'py-14 font-mono text-sm'

  return (
    <div
      className={cn('w-full overflow-x-auto bg-card', wrapClass, className)}
      aria-busy={loading || undefined}
      aria-label={loading ? t('a11y.loadingTable') : undefined}
    >
      <Table>
        <TableHeader>
          <TableRow className={cn('hover:bg-transparent', headRowClass)}>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(headCellClass, alignClass[c.align ?? 'left'], c.className)}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className={cn(skeletonRowClass, 'hover:bg-transparent')}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(skeletonCellPad, alignClass[c.align ?? 'left'])}>
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className={cn(skeletonRowClass, 'hover:bg-transparent')}>
              <TableCell
                colSpan={columns.length}
                className={cn('text-center text-muted-foreground', emptyCellClass)}
              >
                {resolvedEmptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={getKey(row, i)}
                className={cn(bodyRowBase, onRowClick && 'cursor-pointer')}
                data-clickable={onRowClick ? 'true' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(cellClass, alignClass[c.align ?? 'left'], c.className)}
                  >
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
