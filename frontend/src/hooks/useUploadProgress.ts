import { useEffect, useRef, useState } from 'react'
import { getUploadedFile } from '@/api/uploadApi'
import { usePageVisible } from './usePageVisible'
import type { UploadedFile } from '@/types/file'

/** 轮询单个文件解析状态/进度，直到 ready/failed 或页面不可见。每 2s 一次。 */
export function useUploadProgress(file: UploadedFile | null, onDone?: (f: UploadedFile) => void) {
  const [current, setCurrent] = useState<UploadedFile | null>(file)
  const pageVisible = usePageVisible()
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const currentRef = useRef(current)
  currentRef.current = current
  const doneFiredRef = useRef(false)

  useEffect(() => {
    setCurrent(file)
    doneFiredRef.current = false
  }, [file])

  const polling =
    current !== null && (current.status === 'pending' || current.status === 'parsing')

  useEffect(() => {
    if (!polling || !pageVisible) return
    let cancelled = false
    const timer = window.setInterval(async () => {
      const cur = currentRef.current
      if (!cur || cancelled) return
      try {
        const next = await getUploadedFile(cur.fileId)
        if (cancelled) return
        setCurrent(next)
        if (
          (next.status === 'ready' || next.status === 'failed') &&
          !doneFiredRef.current
        ) {
          doneFiredRef.current = true
          onDoneRef.current?.(next)
        }
      } catch {
        // 静默重试
      }
    }, 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [polling, pageVisible])

  return current
}
