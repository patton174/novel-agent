import { useCallback, useEffect, useState } from 'react'
import { fetchAuditLogs, type AuditLogItem } from '@/api/billingAdminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContentPending } from '@/components/loading/ContentPending'
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

  if (loading && logs === null) {
    return <ContentPending label="加载审计日志…" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={action}
          onChange={(e) => {
            setPageCurrent(1)
            setAction(e.target.value)
          }}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Input
          className="w-40"
          placeholder="操作者 ID"
          value={actorIdInput}
          onChange={(e) => {
            setPageCurrent(1)
            setActorIdInput(e.target.value)
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
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
            {(logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  暂无审计记录
                </td>
              </tr>
            ) : (
              (logs ?? []).map((log) => (
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
                  <td className="max-w-xs px-4 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {log.beforeJson ? `− ${truncate(log.beforeJson)}` : null}
                    {log.afterJson ? (
                      <div className="text-foreground">+ {truncate(log.afterJson)}</div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            共 {totalCount} 条 · 第 {pageCurrent}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageCurrent <= 1 || loading}
              onClick={() => setPageCurrent((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageCurrent >= totalPages || loading}
              onClick={() => setPageCurrent((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function truncate(json: string, max = 120): string {
  return json.length <= max ? json : `${json.slice(0, max)}…`
}
