import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from 'lucide-react'
import { fetchCrawlLogs, type CrawlJobStatus, type CrawlLogEntry } from '@/api/crawlAdminApi'
import { cn } from '@/lib/utils'

const LEVEL_STYLES: Record<string, string> = {
  DEBUG: 'text-zinc-500',
  INFO: 'text-sky-400',
  SUCCESS: 'text-emerald-400',
  WARN: 'text-amber-400',
  ERROR: 'text-rose-400',
}

const LEVEL_BADGE: Record<string, string> = {
  DEBUG: 'bg-zinc-500/15 text-zinc-400',
  INFO: 'bg-sky-500/15 text-sky-400',
  SUCCESS: 'bg-emerald-500/15 text-emerald-400',
  WARN: 'bg-amber-500/15 text-amber-400',
  ERROR: 'bg-rose-500/15 text-rose-400',
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface CrawlLogTerminalProps {
  jobId: string
  jobStatus: CrawlJobStatus
  /** modal 内嵌：始终展示、更高日志区 */
  variant?: 'inline' | 'modal'
  active?: boolean
}

export function CrawlLogTerminal({
  jobId,
  jobStatus,
  variant = 'inline',
  active = true,
}: CrawlLogTerminalProps) {
  const { t } = useTranslation(['admin'])
  const [open, setOpen] = useState(variant === 'modal')
  const [logs, setLogs] = useState<CrawlLogEntry[]>([])
  const [maxSeq, setMaxSeq] = useState(0)
  const [loading, setLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxSeqRef = useRef(0)

  const isLive = jobStatus === 'RUNNING' || jobStatus === 'PENDING'
  const isVisible = variant === 'modal' ? active : open

  const pull = useCallback(async () => {
    try {
      const res = await fetchCrawlLogs(jobId, maxSeqRef.current)
      if (res.logs.length > 0) {
        setLogs((prev) => {
          const seen = new Set(prev.map((l) => l.seq))
          const merged = [...prev]
          for (const entry of res.logs) {
            if (!seen.has(entry.seq)) {
              merged.push(entry)
            }
          }
          return merged
        })
      }
      if (res.maxSeq > maxSeqRef.current) {
        maxSeqRef.current = res.maxSeq
        setMaxSeq(res.maxSeq)
      }
    } catch {
      /* 轮询失败静默 */
    }
  }, [jobId])

  useEffect(() => {
    maxSeqRef.current = 0
    setLogs([])
    setMaxSeq(0)
  }, [jobId])

  useEffect(() => {
    if (!isVisible) {
      return
    }
    setLoading(true)
    void pull().finally(() => setLoading(false))
  }, [isVisible, jobId, pull])

  useEffect(() => {
    if (!isVisible || !isLive) {
      return
    }
    const timer = window.setInterval(() => void pull(), 600)
    return () => window.clearInterval(timer)
  }, [isVisible, isLive, pull])

  useEffect(() => {
    if (!isVisible || !autoScroll || !scrollRef.current) {
      return
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs, isVisible, autoScroll])

  const panel = (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-inner">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          crawl · {jobId.slice(0, 8)}…
          {isLive ? (
            <span className="ml-2 inline-flex items-center gap-1 text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              {t('admin:crawler.live')}
            </span>
          ) : null}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="size-3 rounded border-zinc-600 bg-zinc-900"
          />
          {t('admin:crawler.autoScroll')}
        </label>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          'overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed',
          variant === 'modal' ? 'h-[min(52vh,420px)]' : 'max-h-56',
        )}
      >
        {loading && logs.length === 0 ? (
          <p className="text-zinc-500">{t('admin:crawler.loadingJobLog')}</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-500">{t('admin:crawler.emptyJobLog')}</p>
        ) : (
          logs.map((entry) => {
            const level = (entry.level || 'INFO').toUpperCase()
            return (
              <div key={entry.seq} className="flex gap-2 py-0.5">
                <span className="shrink-0 tabular-nums text-zinc-600">{formatTime(entry.ts)}</span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase',
                    LEVEL_BADGE[level] ?? LEVEL_BADGE.INFO,
                  )}
                >
                  {level}
                </span>
                <span className={cn('min-w-0 break-all', LEVEL_STYLES[level] ?? LEVEL_STYLES.INFO)}>
                  {entry.message}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  if (variant === 'modal') {
    return panel
  }

  return (
    <div className="mt-3 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Terminal className="size-3.5" />
        {open ? t('admin:crawler.hideJobLog') : t('admin:crawler.viewJobLog')}
        {maxSeq > 0 && !open ? <span className="text-muted-foreground/70">{t('admin:crawler.jobLogCount', { count: maxSeq })}</span> : null}
      </button>
      {open ? <div className="mt-2">{panel}</div> : null}
    </div>
  )
}
