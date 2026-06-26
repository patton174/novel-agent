import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Lock } from 'lucide-react'
import { AdminButtonGhost } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { PixelBadge, PixelTable, type PixelColumn, PIXEL_PANEL } from '@/components/pixel'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { cn } from '@/lib/utils'

type MatrixRow = {
  permission: string
  user: boolean
  vip: boolean
  admin: boolean
}

export default function UserPermissionsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()

  const rows: MatrixRow[] = [
    { permission: 'novel:read', user: true, vip: true, admin: true },
    { permission: 'novel:write', user: true, vip: true, admin: true },
    { permission: 'admin:crm', user: false, vip: false, admin: true },
    { permission: 'billing:manage', user: false, vip: false, admin: true },
  ]

  const roleColumns = (['user', 'vip', 'admin'] as const).map((role) => ({
    key: role,
    header: t(
      role === 'user' ? 'admin:users.roleUser' : role === 'vip' ? 'admin:users.roleVip' : 'admin:users.roleAdmin',
    ),
    align: 'center' as const,
    render: (row: MatrixRow) => (
      <PixelBadge tone={row[role] ? 'success' : 'muted'}>{row[role] ? '✓' : '—'}</PixelBadge>
    ),
  }))

  const columns: PixelColumn<MatrixRow>[] = [
    {
      key: 'permission',
      header: t('admin:permissions.colPermission'),
      render: (row) => <span className="font-mono text-xs">{row.permission}</span>,
    },
    ...roleColumns,
  ]

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:permissions.title')}
          description={t('admin:permissions.desc')}
          action={
            <AdminButtonGhost asChild>
              <Link to="/admin/users/roles">
                {t('admin:permissions.openRoles')}
                <ArrowRight className="size-3.5" />
              </Link>
            </AdminButtonGhost>
          }
        />
        <AdminDataPanelBody className="space-y-4">
          <div className={cn(PIXEL_PANEL, 'flex gap-3 p-4')}>
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">{t('admin:permissions.modelHint')}</p>
          </div>
          <PixelTable columns={columns} data={rows} rowKey="permission" compact />
          <p className="text-xs text-muted-foreground">{t('admin:permissions.futureHint')}</p>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
