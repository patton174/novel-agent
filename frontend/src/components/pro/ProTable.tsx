import { type ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function ProTable<T>({ columns, data, rowKey, loading, skeletonRows = 5, emptyText = '暂无数据', onRowClick, className, dense = false }: ProTableProps<T>) {
  const getKey = (row: T, i: number) => (typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey as keyof T] ?? i))
  return (
    <div
      className={cn(
        'w-full overflow-x-auto bg-white',
        dense ? 'rounded-lg border border-border' : 'border-2 border-black',
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow
            className={cn(
              'hover:bg-transparent',
              dense
                ? 'border-b border-border bg-muted/40 text-muted-foreground'
                : 'border-b-2 border-black bg-ink text-surface',
            )}
          >
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  dense
                    ? 'h-9 px-4 text-left text-xs font-medium uppercase tracking-wide'
                    : 'h-12 px-4 font-mono text-xs font-bold uppercase tracking-widest text-surface',
                  alignClass[c.align ?? 'left'],
                  c.className,
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className={cn(dense ? 'border-b border-border' : 'border-b border-black/30', 'hover:bg-transparent')}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(dense ? 'px-4 py-2.5' : 'px-4 py-4', alignClass[c.align ?? 'left'])}>
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className={cn(dense ? 'border-b border-border' : 'border-b border-black/30', 'hover:bg-transparent')}>
              <TableCell
                colSpan={columns.length}
                className={cn('text-center text-muted-foreground', dense ? 'py-10 text-sm' : 'py-14 font-mono text-sm')}
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={getKey(row, i)}
                className={cn(
                  dense ? 'border-b border-border hover:bg-muted/30' : 'border-b border-black/30 hover:bg-neon',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      dense ? 'px-4 py-2.5 text-sm text-foreground' : 'px-4 py-4 text-sm font-medium text-ink',
                      alignClass[c.align ?? 'left'],
                      c.className,
                    )}
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
