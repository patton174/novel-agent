import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { formatIdrProjectLabel } from '@/api/idrAdminApi'
import { IdrCatalogPanel, type IdrCatalogView } from '@/components/admin/IdrCatalogPanel'
import {
  AdminButtonIcon,
  AdminField,
  AdminNotice,
  AdminSelect,
} from '@/components/admin/AdminFormControls'
import { AdminDataPage } from '@/components/layout/AdminDataLayout'
import { useAdminIdrProjectPicker } from '@/hooks/useAdminIdrProjectPicker'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminIdrProjectPanel({ view }: { view: IdrCatalogView }) {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const { projects, projectId, setProjectId, loading, canUseCatalog, refresh } = useAdminIdrProjectPicker()

  return (
    <AdminDataPage>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <AdminField label={t('admin:products.catalogPickProject')} className="min-w-[240px] sm:max-w-sm">
          {loading ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : (
            <AdminSelect
              value={projectId ?? ''}
              disabled={!canUseCatalog}
              onChange={(e) => setProjectId(e.target.value || null)}
            >
              <option value="">{t('admin:products.pickProjectPlaceholder')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {formatIdrProjectLabel(project)}
                </option>
              ))}
            </AdminSelect>
          )}
        </AdminField>
        <AdminButtonIcon onClick={() => void refresh()} disabled={loading} aria-label={t('admin:products.catalogRefresh')}>
          <RefreshCw className="size-4" />
        </AdminButtonIcon>
      </div>

      {!loading && !canUseCatalog ? (
        <AdminNotice>{t('admin:products.catalogNeedSecret')}</AdminNotice>
      ) : (
        <IdrCatalogPanel projectId={projectId} view={view} />
      )}
    </AdminDataPage>
  )
}
