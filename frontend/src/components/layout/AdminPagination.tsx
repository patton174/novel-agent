import { Button } from '@/components/ui/button'

/** 管理台列表分页 — Users / Audit 等统一规则 */
export function AdminPagination({
  pageCurrent,
  totalPages,
  totalCount,
  loading,
  onPageChange,
}: {
  pageCurrent: number
  totalPages: number
  totalCount: number
  loading?: boolean
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        共 {totalCount.toLocaleString('zh-CN')} 条
        {totalPages > 1 ? (
          <>
            {' '}
            · 第 {pageCurrent}/{totalPages} 页
          </>
        ) : null}
      </p>
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageCurrent <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, pageCurrent - 1))}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageCurrent >= totalPages || loading}
            onClick={() => onPageChange(pageCurrent + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  )
}
