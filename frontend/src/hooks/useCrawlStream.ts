import { useEffect, useRef } from 'react'

interface UseCrawlStreamOptions {
  onDecision?: (decision: string) => void
  onJobStatus?: (jobId: string, status: string) => void
  onJobLog?: (jobId: string, level: string, message: string) => void
  enabled?: boolean
}

/** 订阅爬虫 SSE 流。EventSource 走 cookie 鉴权。 */
export function useCrawlStream(opts: UseCrawlStreamOptions = {}) {
  const { onDecision, onJobStatus, onJobLog, enabled = true } = opts
  const cbRef = useRef({ onDecision, onJobStatus, onJobLog })
  cbRef.current = { onDecision, onJobStatus, onJobLog }

  useEffect(() => {
    if (!enabled) return
    const es = new EventSource('/api/content/crm/crawl/stream', { withCredentials: true })

    es.addEventListener('orchestrator_decision', (e) => {
      try {
        cbRef.current.onDecision?.(JSON.parse(e.data).decision)
      } catch {
        /* ignore malformed payload */
      }
    })
    es.addEventListener('job_status', (e) => {
      try {
        const d = JSON.parse(e.data)
        cbRef.current.onJobStatus?.(d.jobId, d.status)
      } catch {
        /* ignore malformed payload */
      }
    })
    es.addEventListener('job_log', (e) => {
      try {
        const d = JSON.parse(e.data)
        cbRef.current.onJobLog?.(d.jobId, d.level, d.message)
      } catch {
        /* ignore malformed payload */
      }
    })
    es.onerror = () => {
      /* EventSource 自动重连 */
    }

    return () => es.close()
  }, [enabled])
}
