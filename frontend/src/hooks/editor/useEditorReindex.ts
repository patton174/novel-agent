import { useCallback, useEffect, useState } from 'react'
import i18n from '@/i18n'
import { api } from '../../utils/api'
import { alertDialog } from '../../stores/appDialog'

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
          title: i18n.t('editor:reindex.completeTitle'),
          description: i18n.t('editor:reindex.completeDesc', {
            indexed: status.indexed,
            chapters: status.chapters,
          }),
        })
      }
    } catch {
      setReindexing(false)
      setReindexProgress(null)
      void alertDialog({
        title: i18n.t('editor:reindex.startFailTitle'),
        description: i18n.t('editor:reindex.startFailDesc'),
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
            title: i18n.t('editor:reindex.completeTitle'),
            description: i18n.t('editor:reindex.completeDesc', {
              indexed: status.indexed,
              chapters: status.chapters,
            }),
          })
        } else if (status.status === 'failed') {
          void alertDialog({
            title: i18n.t('editor:reindex.failTitle'),
            description: status.error ?? i18n.t('editor:reindex.unknownError'),
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
