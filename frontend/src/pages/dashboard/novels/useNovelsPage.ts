import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { fetchNovels, generateNovelCover, type DashboardNovel } from '@/api/dashboardApi'
import type { CoverGeneratePayload } from '@/components/dashboard/CoverGenerateDialog'
import { invalidateStoragePresign } from '@/api/storageApi'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import { appToast } from '@/stores/appToastStore'

/** 桌面表格 / 移动卡片共用的每页尺寸 */
export const NOVELS_PAGE_SIZE = 10

/** 小说更新时间格式化（沿用原 NovelsPage 行为） */
export function formatNovelDate(ts: number): string {
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isFeatureNotAvailable(message: string): boolean {
  return (['zh', 'en'] as const).some((lng) =>
    message.includes(i18n.t('dashboard:billing.errors.featureNotAvailable', { lng })),
  )
}

export interface UseNovelsPageResult {
  /** 全量列表；null 表示尚未加载完成（与原页面 loading 语义一致） */
  novels: DashboardNovel[] | null
  /** 当前页切片，供视图直接渲染 */
  pagedNovels: DashboardNovel[]
  loading: boolean
  error: boolean
  page: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  refetch: () => void
  generatingId: string | null
  dialogNovel: DashboardNovel | null
  setDialogNovel: (novel: DashboardNovel | null) => void
  handleGenerateCover: (novelId: string, payload: CoverGeneratePayload) => void
}

/**
 * 我的小说页数据 / 分页 / 封面生成逻辑（自原 NovelsPage 原样迁移，
 * 新增客户端分页以适配 ProTable + ProPagination）。
 */
export function useNovelsPage(): UseNovelsPageResult {
  const { t } = useTranslation(['dashboard'])
  const [novels, setNovels] = useState<DashboardNovel[] | null>(() => dashboardCache.getNovels())
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = NOVELS_PAGE_SIZE
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [dialogNovel, setDialogNovel] = useState<DashboardNovel | null>(null)

  const load = useCallback(() => {
    let cancelled = false
    void fetchNovels()
      .then((list) => {
        if (!cancelled) {
          dashboardCache.setNovels(list)
          setNovels(list)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNovels([])
          setError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  const refetch = useCallback(() => {
    load()
  }, [load])

  const handleGenerateCover = useCallback(
    (novelId: string, payload: CoverGeneratePayload) => {
      setGeneratingId(novelId)
      setDialogNovel(null)
      void generateNovelCover(novelId, payload)
        .then((updated) => {
          if (updated) {
            if (updated.coverStorageKey) {
              invalidateStoragePresign(updated.coverStorageKey)
            }
            setNovels((prev) => {
              if (!prev) return prev
              const next = prev.map((n) => (n.id === novelId ? { ...n, ...updated } : n))
              dashboardCache.setNovels(next)
              return next
            })
            appToast.success(t('dashboard:novels.coverSuccess'))
          }
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : t('dashboard:novels.coverFail')
          appToast.error(
            isFeatureNotAvailable(message) ? `${message}${t('dashboard:novels.upgradeHint')}` : message,
          )
        })
        .finally(() => {
          setGeneratingId(null)
        })
    },
    [t],
  )

  const loading = novels === null
  const total = novels?.length ?? 0
  const pagedNovels = novels ? novels.slice((page - 1) * pageSize, page * pageSize) : []

  // 列表变化后若当前页越界，回退到最后一页
  useEffect(() => {
    if (!novels) return
    const totalPages = Math.max(1, Math.ceil(novels.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [novels, page, pageSize])

  return {
    novels,
    pagedNovels,
    loading,
    error,
    page,
    pageSize,
    total,
    setPage,
    refetch,
    generatingId,
    dialogNovel,
    setDialogNovel,
    handleGenerateCover,
  }
}
