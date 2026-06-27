import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { invalidateStoragePresign, presignStorageObject, resolveStorageMediaUrl } from '@/api/storageApi'
import { cn } from '@/lib/utils'

export interface StoredMediaPreviewProps {
  /** 落盘 storage key；存在时走通用预签名接口 */
  storageKey?: string | null
  /** 遗留直链（http/https/data）或无需预签名的外部 URL */
  fallbackUrl?: string | null
  alt?: string
  className?: string
  imageClassName?: string
  animateReveal?: boolean
  placeholder?: ReactNode
  loadingClassName?: string
  /** 重新生成后传入新 key 或 bump 以强制刷新预签名 */
  refreshToken?: string | number
}

/**
 * 通用存储对象预览：有 storageKey 时 POST /api/content/auth/storage/presign，
 * 再用返回的签名 URL 渲染（img 标签无法带鉴权头）。
 */
export function StoredMediaPreview({
  storageKey,
  fallbackUrl,
  alt = '',
  className,
  imageClassName,
  animateReveal = true,
  placeholder,
  loadingClassName,
  refreshToken,
}: StoredMediaPreviewProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const key = storageKey?.trim() ?? ''
  const legacyUrl = fallbackUrl?.trim() ?? ''

  useEffect(() => {
    let cancelled = false

    if (key) {
      if (refreshToken != null) {
        invalidateStoragePresign(key)
      }
      setLoading(true)
      void presignStorageObject(key)
        .then((url) => {
          if (!cancelled) {
            setSrc(url ? resolveStorageMediaUrl(url) : null)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSrc(null)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    } else if (legacyUrl) {
      setSrc(resolveStorageMediaUrl(legacyUrl))
      setLoading(false)
    } else {
      setSrc(null)
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [key, legacyUrl, refreshToken])

  if (loading) {
    return (
      <div
        className={cn(
          'h-full w-full animate-pulse bg-gradient-to-br from-muted/80 to-muted/40',
          loadingClassName,
          className,
        )}
        aria-hidden
      />
    )
  }

  if (!src) {
    if (placeholder) {
      return <div className={cn('h-full w-full', className)}>{placeholder}</div>
    }
    return null
  }

  const img = (
    <img
      src={src}
      alt={alt}
      className={cn('h-full w-full object-cover', imageClassName)}
      loading="lazy"
      decoding="async"
    />
  )

  if (!animateReveal) {
    return <div className={cn('h-full w-full overflow-hidden', className)}>{img}</div>
  }

  return (
    <div className={cn('h-full w-full overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={src}
          className="h-full w-full"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {img}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
