import type { MouseEvent, ReactNode } from 'react'
import { DataTableFrame } from '@/components/layout/DataTableFrame'
import { AppShellCard } from '@/components/layout/AppPageStack'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export interface ResponsiveTableColumn<TRow> {
  key: string
  header: ReactNode
  headerClassName?: string
  cellClassName?: string
  renderCell: (row: TRow) => ReactNode
}

export interface ResponsiveTableProps<TRow> {
  columns: ResponsiveTableColumn<TRow>[]
  rows: TRow[]
  getRowKey: (row: TRow, index: number) => string | number
  renderMobileCard: (row: TRow, index: number) => ReactNode
  loading?: boolean
  loadingRowCount?: number
  loadingCardCount?: number
  renderLoadingMobileCard?: (index: number) => ReactNode
  emptyState?: ReactNode
  renderMobileEmpty?: ReactNode
  renderDesktopEmpty?: ReactNode
  mobileListClassName?: string
  desktopCardClassName?: string
  wrapDesktopInCard?: boolean
  tableClassName?: string
  tableHeaderClassName?: string
  tableBodyClassName?: string
  desktopSkeletonClassName?: string
  tableRowClassName?: string | ((row: TRow, index: number) => string | undefined)
  onDesktopRowClick?: (row: TRow, index: number, event: MouseEvent<HTMLTableRowElement>) => void
  dataTableFrameClassName?: string
  desktopEmbedded?: boolean
  desktopScrollHint?: boolean
  renderDesktopContainer?: (content: ReactNode) => ReactNode
  renderDesktopCustom?: (rows: TRow[]) => ReactNode
}

export function ResponsiveTable<TRow>({
  columns,
  rows,
  getRowKey,
  renderMobileCard,
  loading = false,
  loadingRowCount = 5,
  loadingCardCount = 4,
  renderLoadingMobileCard,
  emptyState,
  renderMobileEmpty,
  renderDesktopEmpty,
  mobileListClassName,
  desktopCardClassName,
  wrapDesktopInCard = true,
  tableClassName,
  tableHeaderClassName,
  tableBodyClassName,
  desktopSkeletonClassName = 'h-4 w-full max-w-24',
  tableRowClassName,
  onDesktopRowClick,
  dataTableFrameClassName,
  desktopEmbedded = true,
  desktopScrollHint = false,
  renderDesktopContainer,
  renderDesktopCustom,
}: ResponsiveTableProps<TRow>) {
  const isMobile = useAppMobile()

  if (!loading && rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  if (isMobile) {
    return (
      <div className={cn('space-y-3', mobileListClassName)}>
        {loading
          ? Array.from({ length: loadingCardCount }).map((_, index) =>
              renderLoadingMobileCard ? (
                <div key={`mobile-loading-${index}`}>{renderLoadingMobileCard(index)}</div>
              ) : (
                <Skeleton key={`mobile-loading-${index}`} className="h-24 w-full rounded-xl" />
              ),
            )
          : rows.length === 0
            ? renderMobileEmpty
            : rows.map((row, index) => (
                <div key={getRowKey(row, index)}>{renderMobileCard(row, index)}</div>
              ))}
      </div>
    )
  }

  const desktopTableContent = (
    <>
      <DataTableFrame
        embedded={desktopEmbedded}
        scrollHint={desktopScrollHint}
        className={dataTableFrameClassName}
      >
        <Table className={tableClassName}>
          <TableHeader className={tableHeaderClassName}>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClassName}>
            {loading
              ? Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                  <TableRow key={`desktop-loading-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell key={`${column.key}-${rowIndex}`} className={column.cellClassName}>
                        <Skeleton className={desktopSkeletonClassName} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        {renderDesktopEmpty ?? (
                          <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                : rows.map((row, index) => (
                    <TableRow
                      key={getRowKey(row, index)}
                      className={
                        typeof tableRowClassName === 'function'
                          ? tableRowClassName(row, index)
                          : tableRowClassName
                      }
                      onClick={(event) => onDesktopRowClick?.(row, index, event)}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.key} className={column.cellClassName}>
                          {column.renderCell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </DataTableFrame>
    </>
  )

  const baseDesktopContent = renderDesktopCustom ? renderDesktopCustom(rows) : desktopTableContent

  const desktopContent = wrapDesktopInCard ? (
    <AppShellCard className={cn(desktopCardClassName)}>{baseDesktopContent}</AppShellCard>
  ) : (
    baseDesktopContent
  )

  return renderDesktopContainer ? <>{renderDesktopContainer(desktopContent)}</> : desktopContent
}
