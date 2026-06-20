import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export interface ProPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function ProPagination({ page, pageSize, total, onPageChange, className }: ProPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages
  return (
    <div className={cn('flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground', className)}>
      <span className="tabular-nums">{start}-{end} / {total}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="上一页"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
          className={cn('inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40')}
        >
          <IconChevronLeft size={16} stroke={2} />
        </button>
        <span className="min-w-[3rem] text-center tabular-nums text-foreground">{page} / {totalPages}</span>
        <button
          type="button"
          aria-label="下一页"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
          className={cn('inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40')}
        >
          <IconChevronRight size={16} stroke={2} />
        </button>
      </div>
    </div>
  )
}
