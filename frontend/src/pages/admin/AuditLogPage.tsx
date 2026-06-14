import { useCallback, useEffect, useState } from 'react'
import { fetchAuditLogs, type AuditLogItem } from '@/api/billingAdminApi'
import { DataTableFrame } from '@/components/layout/DataTableFrame'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { AdminNativeSelect } from '@/components/layout/AdminNativeSelect'
import { AdminPagination } from '@/components/layout/AdminPagination'
import { AuditLogDetailModal } from '@/components/admin/AuditLogDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'plan.create', label: '套餐创建' },
  { value: 'plan.update', label: '套餐更新' },
  { value: 'plan.delete', label: '套餐停用' },
  { value: 'user.subscription.change', label: '订阅变更' },
  { value: 'user.quota.override', label: '临时配额' },
  { value: 'user.role.change', label: '角色变更' },
  { value: 'site.content.update', label: '站点内容' },
  { value: 'site.settings.update', label: '系统参数' },
]

export default function AuditLogPage() {
  useMarkRouteSeen()
  const [logs, setLogs] = useState<AuditLogItem[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [action, setAction] = useState('')
  const [actorIdInput, setActorIdInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLog, setDetailLog] = useState<AuditLogItem | null>(null)

  const load = useCallback(async (page: number, actionFilter: string, actorFilter: string) => {
    setLoading(true)
    try {
      const actorId = actorFilter.trim() ? Number(actorFilter) : undefined
      const data = await fetchAuditLogs({
        pageCurrent: page,
        pageSize: PAGE_SIZE,
        action: actionFilter || undefined,
        actorId: Number.isFinite(actorId) ? actorId : undefined,
      })
      setLogs(data.list)
      setTotalCount(data.totalCount)
      setPageCurrent(data.pageCurrent)
    } catch (err) {
      setLogs([])
      appToast.error(err instanceof Error ? err.message : '加载审计日志失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(pageCurrent, action, actorIdInput)
  }, [load, pageCurrent, action, actorIdInput])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const list = logs ?? []
  const initialLoading = loading && logs === null

  return (
    <AppPageStack className="gap-4">
      <AppShellCard>
        <AppShellCardHeader title="筛选" description="按操作类型或操作者 ID 过滤审计记录" />
        <AppShellCardBody className="py-4">
          <div className="flex flex-wrap gap-2">
            <AdminNativeSelect
              value={action}
              onChange={(e) => {
                setPageCurrent(1)
                setAction(e.target.value)
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AdminNativeSelect>
            <Input
              className="h-9 w-full min-w-0 rounded-xl sm:w-40"
              placeholder="操作者 ID"
              value={actorIdInput}
              onChange={(e) => {
                setPageCurrent(1)
                setActorIdInput(e.target.value)
              }}
            />
          </div>
        </AppShellCardBody>
      </AppShellCard>

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {initialLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无审计记录</p>
        ) : (
          list.map((log) => (
            <article
              key={log.id}
              className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm"
            >
              <p className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleString('zh-CN')}
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-foreground">{log.action}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <dt className="text-muted-foreground">操作者</dt>
                  <dd className="tabular-nums">{log.actorId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">目标</dt>
                  <dd className="truncate">
                    {log.targetType ?? '—'}
                    {log.targetId ? ` #${log.targetId}` : ''}
                  </dd>
                </div>
              </dl>
              {(log.beforeJson || log.afterJson) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 w-full rounded-lg text-xs"
                  onClick={() => setDetailLog(log)}
                >
                  查看变更详情
                </Button>
              )}
            </article>
          ))
        )}
      </div>

      <AppShellCard className="hidden md:block">
        <AppShellCardHeader title="审计日志" description={`共 ${totalCount.toLocaleString('zh-CN')} 条记录`} />
        <DataTableFrame embedded scrollHint={false}>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
                <th className="px-4 py-3 font-medium">操作者</th>
                <th className="px-4 py-3 font-medium">目标</th>
                <th className="px-4 py-3 font-medium">变更</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-28" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    暂无审计记录
                  </td>
                </tr>
              ) : (
                list.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 tabular-nums">{log.actorId}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.targetType ?? '—'}
                      {log.targetId ? ` #${log.targetId}` : ''}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {log.beforeJson || log.afterJson ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-primary"
                          onClick={() => setDetailLog(log)}
                        >
                          查看 JSON
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableFrame>
      </AppShellCard>

      <AdminPagination
        pageCurrent={pageCurrent}
        totalPages={totalPages}
        totalCount={totalCount}
        loading={loading}
        onPageChange={setPageCurrent}
      />

      <AuditLogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />
    </AppPageStack>
  )
}
