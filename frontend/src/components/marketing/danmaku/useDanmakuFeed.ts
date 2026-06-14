import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDanmakuPage, postDanmaku, type SiteDanmaku } from '@/api/billingApi'
import { ensureCryptoReady } from '@/security/sessionBootstrap'

const PAGE_SIZE = 20
const REFETCH_MS = 18_000

function mergeUnique(prev: SiteDanmaku[], incoming: SiteDanmaku[]): SiteDanmaku[] {
  const seen = new Set(prev.map((x) => x.id))
  const out = [...prev]
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      out.push(item)
    }
  }
  return out
}

export function useDanmakuFeed() {
  const [pool, setPool] = useState<SiteDanmaku[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalFetched, setTotalFetched] = useState(0)
  const nextBeforeIdRef = useRef<number | null>(null)
  const hasMoreRef = useRef(true)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    if (!reset && !hasMoreRef.current) return
    loadingRef.current = true
    if (reset) {
      setLoading(true)
      setError(null)
      nextBeforeIdRef.current = null
      hasMoreRef.current = true
    }
    try {
      await ensureCryptoReady()
      const page = await fetchDanmakuPage({
        pageSize: PAGE_SIZE,
        beforeId: reset ? null : nextBeforeIdRef.current,
      })
      hasMoreRef.current = page.hasMore
      nextBeforeIdRef.current = page.nextBeforeId
      setPool((prev) => {
        const merged = reset ? page.list : mergeUnique(prev, page.list)
        setTotalFetched(merged.length)
        return merged
      })
    } catch {
      if (reset) setError('load_failed')
    } finally {
      loadingRef.current = false
      if (reset) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMore(true)
  }, [loadMore])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMore(false)
    }, REFETCH_MS)
    return () => window.clearInterval(id)
  }, [loadMore])

  const submit = useCallback(async (message: string) => {
    const created = await postDanmaku(message)
    setPool((prev) => [created, ...prev])
    setTotalFetched((n) => n + 1)
    return created
  }, [])

  return {
    pool,
    loading,
    error,
    totalFetched,
    hasMore: hasMoreRef.current,
    reload: () => loadMore(true),
    loadMore: () => loadMore(false),
    submit,
  }
}
