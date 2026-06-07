import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Brain } from 'lucide-react'
import {
  fetchOrchestratorDecisions,
  type OrchestratorDecisionEntry,
} from '@/api/orchestratorAdminApi'
import { cn } from '@/lib/utils'
import { InlineBrandLoader } from '@/components/loading/BrandLoader'

const MAX_LOG_LINES = 250

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const LogLine = memo(function LogLine({ entry }: { entry: OrchestratorDecisionEntry }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="shrink-0 tabular-nums text-zinc-600">{formatTime(entry.ts)}</span>
      <span
        className={cn(
          'min-w-0 break-all',
          entry.message.startsWith('目标')
            ? 'text-violet-400'
            : entry.message.includes('未启用') ||
                entry.message.includes('失败') ||
                entry.message.includes('异常') ||
                entry.message.includes('错误')
              ? 'text-rose-400'
              : 'text-sky-300',
        )}
      >
        {entry.message}
      </span>
    </div>
  )
})

interface OrchestratorLogTerminalProps {
  status?: string
  active?: boolean
  refreshKey?: number
  /** 页面不可见时暂停轮询 */
  paused?: boolean
}

export function OrchestratorLogTerminal({
  status,
  active = true,
  refreshKey = 0,
  paused = false,
}: OrchestratorLogTerminalProps) {
  const [logs, setLogs] = useState<OrchestratorDecisionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxSeqRef = useRef(0)

  const isLive = status === 'RUNNING'

  const pull = useCallback(async (bootstrap = false) => {
    try {
      const afterSeq = bootstrap ? 0 : maxSeqRef.current
      const res = await fetchOrchestratorDecisions(afterSeq, bootstrap ? 200 : 80)
      setFetchError(null)
      if (bootstrap) {
        setLogs(res.logs.slice(-MAX_LOG_LINES))
        maxSeqRef.current = res.maxSeq
        return
      }
      if (res.logs.length > 0) {
        setLogs((prev) => {
          const seen = new Set(prev.map((l) => l.seq))
          const merged = [...prev]
          for (const entry of res.logs) {
            if (!seen.has(entry.seq)) merged.push(entry)
          }
          return merged.length > MAX_LOG_LINES ? merged.slice(-MAX_LOG_LINES) : merged
        })
      }
      if (res.maxSeq > maxSeqRef.current) {
        maxSeqRef.current = res.maxSeq
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '加载日志失败')
    }
  }, [])

  useEffect(() => {
    if (!active) return
    maxSeqRef.current = 0
    setLoading(true)
    void pull(true).finally(() => setLoading(false))
  }, [active, refreshKey, pull])

  useEffect(() => {
    if (!active || paused) return
    const intervalMs = isLive ? 3000 : 8000
    const timer = window.setInterval(() => void pull(false), intervalMs)
    return () => window.clearInterval(timer)
  }, [active, isLive, paused, pull])

  useEffect(() => {
    if (!active || !autoScroll || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs, active, autoScroll])

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117] shadow-inner">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <Brain className="size-3.5" />
          决策日志
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              实时
            </span>
          ) : null}
          {paused ? <span className="text-zinc-600">· 已暂停</span> : null}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="size-3 rounded border-zinc-600 bg-zinc-900"
          />
          自动滚动
        </label>
      </div>
      {fetchError ? (
        <p className="border-b border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
          {fetchError}
        </p>
      ) : null}
      <div
        ref={scrollRef}
        className="h-[min(36vh,320px)] overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed"
      >
        {loading && logs.length === 0 ? (
          <InlineBrandLoader label="加载日志" className="text-zinc-500" />
        ) : logs.length === 0 ? (
          <p className="text-zinc-500">暂无决策日志，设定目标或唤醒后将显示主编排决策</p>
        ) : (
          logs.map((entry) => <LogLine key={entry.seq} entry={entry} />)
        )}
      </div>
    </div>
  )
}
