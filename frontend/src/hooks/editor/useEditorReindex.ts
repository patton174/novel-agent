import { useCallback, useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { alertDialog } from '../../stores/confirmDialogStore'

export function useEditorReindex(activeNovelId: string | null) {
  const [reindexing, setReindexing] = useState(false)
  const [reindexProgress, setReindexProgress] = useState<{
    processed: number
    chapters: number
    indexed: number
  } | null>(null)

  const handleReindexNovel = useCallback(async () => {
    if (!activeNovelId || reindexing) return
    setReindexing(true)
    try {
      const status = await api.reindexNovel(activeNovelId)
      if (status.status === 'running') {
        setReindexProgress({
          processed: status.processed,
          chapters: status.chapters,
          indexed: status.indexed,
        })
        return
      }
      setReindexing(false)
      setReindexProgress(null)
      if (status.status === 'completed') {
        void alertDialog({
          title: '索引重建完成',
          description: `${status.indexed}/${status.chapters} 章已索引`,
        })
      }
    } catch {
      setReindexing(false)
      setReindexProgress(null)
      void alertDialog({
        title: '无法启动索引重建',
        description: '请确认 content 与 python-ai 服务已启动',
      })
    }
  }, [activeNovelId, reindexing])

  useEffect(() => {
    if (!activeNovelId) {
      setReindexing(false)
      setReindexProgress(null)
      return
    }
    void api.getReindexStatus(activeNovelId)
      .then((status) => {
        if (status.status !== 'running') return
        setReindexing(true)
        setReindexProgress({
          processed: status.processed,
          chapters: status.chapters,
          indexed: status.indexed,
        })
      })
      .catch(() => {})
  }, [activeNovelId])

  useEffect(() => {
    if (!reindexing || !activeNovelId) return
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      try {
        const status = await api.getReindexStatus(activeNovelId)
        if (cancelled) return
        if (status.status === 'running') {
          setReindexProgress({
            processed: status.processed,
            chapters: status.chapters,
            indexed: status.indexed,
          })
          return
        }
        setReindexing(false)
        setReindexProgress(null)
        if (status.status === 'completed') {
          void alertDialog({
            title: '索引重建完成',
            description: `${status.indexed}/${status.chapters} 章已索引`,
          })
        } else if (status.status === 'failed') {
          void alertDialog({
            title: '索引重建失败',
            description: status.error ?? '未知错误',
          })
        }
      } catch {
        if (cancelled) return
        setReindexing(false)
        setReindexProgress(null)
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [reindexing, activeNovelId])

  return { reindexing, reindexProgress, handleReindexNovel }
}
