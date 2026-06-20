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
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function ProTable<T>({ columns, data, rowKey, loading, skeletonRows = 5, emptyText = '暂无数据', onRowClick, className }: ProTableProps<T>) {
  const getKey = (row: T, i: number) => (typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey as keyof T] ?? i))
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-border/60 bg-surface', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', alignClass[c.align ?? 'left'], c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`sk-${i}`} className="border-border/60">
                {columns.map((c) => (
                  <TableCell key={c.key} className={alignClass[c.align ?? 'left']}>
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={getKey(row, i)} className={cn('border-border/60', onRowClick && 'cursor-pointer')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn('text-sm text-foreground', alignClass[c.align ?? 'left'], c.className)}>
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
