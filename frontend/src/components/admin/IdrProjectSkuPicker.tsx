import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchIdrProjectDetail,
  fetchIdrProjects,
  formatIdrProjectLabel,
  formatIdrSkuLabel,
  type IdrProjectItem,
  type IdrSkuItem,
} from '@/api/idrAdminApi'
import { AdminField, AdminSelect } from '@/components/admin/AdminFormControls'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface IdrProjectSkuPickerProps {
  projectId: string | null | undefined
  skuId: string | null | undefined
  onProjectChange: (projectId: string | null) => void
  onSkuChange: (skuId: string | null) => void
  disabled?: boolean
  className?: string
  /** 为 true 时挂载后自动拉取项目列表（需已保存 Secret） */
  autoLoad?: boolean
  compact?: boolean
  hideProject?: boolean
  hideSku?: boolean
}

export function IdrProjectSkuPicker({
  projectId,
  skuId,
  onProjectChange,
  onSkuChange,
  disabled = false,
  className,
  autoLoad = true,
  compact = false,
  hideProject = false,
  hideSku = false,
}: IdrProjectSkuPickerProps) {
  const { t } = useTranslation(['admin'])
  const [projects, setProjects] = useState<IdrProjectItem[]>([])
  const [skus, setSkus] = useState<IdrSkuItem[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingSkus, setLoadingSkus] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    setCatalogError(null)
    try {
      setProjects(await fetchIdrProjects())
    } catch (err) {
      setProjects([])
      setCatalogError(err instanceof Error ? err.message : t('admin:products.catalogLoadFail'))
    } finally {
      setLoadingProjects(false)
    }
  }, [t])

  const loadSkus = useCallback(async (pid: string) => {
    setLoadingSkus(true)
    try {
      const detail = await fetchIdrProjectDetail(pid)
      setSkus(detail.skus)
    } catch {
      setSkus([])
    } finally {
      setLoadingSkus(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      void loadProjects()
    }
  }, [autoLoad, loadProjects])

  useEffect(() => {
    const pid = projectId?.trim()
    if (!pid) {
      setSkus([])
      return
    }
    void loadSkus(pid)
  }, [projectId, loadSkus])

  const handleProjectChange = (value: string) => {
    const next = value || null
    onProjectChange(next)
    onSkuChange(null)
  }

  if (loadingProjects && projects.length === 0 && !hideProject) {
    return <Skeleton className={cn('h-9 w-full rounded-xl', className)} />
  }

  return (
    <div
      className={cn(
        compact ? 'grid min-w-[280px] grid-cols-2 items-center gap-2' : 'grid gap-3 sm:grid-cols-2 sm:items-start',
        className,
      )}
    >
      {!hideProject ? (
        <AdminField
          label={compact ? '' : t('admin:products.pickProject')}
          layout="form"
          className="min-w-0 sm:max-w-none"
        >
          <AdminSelect
            value={projectId ?? ''}
            disabled={disabled || loadingProjects}
            aria-label={t('admin:products.pickProject')}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">{t('admin:products.pickProjectPlaceholder')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {formatIdrProjectLabel(project)}
              </option>
            ))}
          </AdminSelect>
          {!compact && catalogError ? (
            <p className="text-xs text-destructive">{catalogError}</p>
          ) : null}
        </AdminField>
      ) : null}
      {!hideSku ? (
        <AdminField
          label={compact ? '' : t('admin:products.pickSku')}
          layout="form"
          className="min-w-0 sm:max-w-none"
        >
          <AdminSelect
            value={skuId ?? ''}
            disabled={disabled || !projectId || loadingSkus}
            aria-label={t('admin:products.pickSku')}
            onChange={(e) => onSkuChange(e.target.value || null)}
          >
            <option value="">{t('admin:products.pickSkuPlaceholder')}</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {formatIdrSkuLabel(sku)}
              </option>
            ))}
          </AdminSelect>
          {!compact && projectId && !loadingSkus && skus.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t('admin:products.noSkus')}</span>
          ) : null}
        </AdminField>
      ) : null}
      {!compact && !hideProject ? (
        <div className="sm:col-span-2">
          <button
            type="button"
            className="text-left text-xs text-primary hover:underline disabled:opacity-50"
            disabled={loadingProjects}
            onClick={() => void loadProjects()}
          >
            {loadingProjects ? t('admin:products.catalogLoading') : t('admin:products.catalogRefresh')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
