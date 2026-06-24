import { useCallback, useEffect, useState } from 'react'
import { fetchAvailableModels } from '@/api/modelApi'
import type { AvailableModels } from '@/types/model'

export function useAvailableModels(type = 'llm') {
  const [data, setData] = useState<AvailableModels | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const next = await fetchAvailableModels(type)
      setData(next)
    } catch {
      setData({ publicModels: [], byok: [], credentials: [] })
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchAvailableModels(type)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch(() => {
        if (!cancelled) {
          setData({ publicModels: [], byok: [], credentials: [] })
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [type])

  const empty = !data?.publicModels.length && !data?.byok.length

  return { data, loading, failed, empty, reload }
}
