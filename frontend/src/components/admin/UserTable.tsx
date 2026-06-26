import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/api/adminApi'
import {
  PixelBadge,
  PixelCellStack,
  PixelTable,
  PixelTableActionIconButton,
  type PixelColumn,
} from '@/components/pixel'

interface UserTableProps {
  users: AdminUser[]
  loading: boolean
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}

/** 管理后台用户列表：像素风 PixelTable。 */
export function UserTable({ users, loading, onEdit, onRowClick }: UserTableProps) {
  const { t } = useTranslation(['admin'])
  const ROLE_LABELS: Record<string, string> = {
    user: t('admin:users.roleUser'),
    vip: t('admin:users.roleVip'),
    admin: t('admin:users.roleAdmin'),
  }

  const columns: PixelColumn<AdminUser>[] = [
    {
      key: 'id',
      header: t('admin:users.colId'),
      className: 'tabular-nums',
      render: (u) => u.id,
    },
    {
      key: 'username',
      header: t('admin:users.colUsername'),
      render: (u) => <PixelCellStack title={u.username} subtitle={u.email} />,
    },
    {
      key: 'role',
      header: t('admin:users.colRole'),
      render: (u) => <PixelBadge tone="muted">{ROLE_LABELS[u.role] ?? u.role}</PixelBadge>,
    },
    {
      key: 'status',
      header: t('admin:users.colStatus'),
      render: (u) => (
        <PixelBadge tone={u.isActive ? 'success' : 'danger'}>
          {u.isActive ? t('admin:users.statusActive') : t('admin:users.statusDisabled')}
        </PixelBadge>
      ),
    },
    {
      key: 'actions',
      header: t('admin:users.colActions'),
      align: 'right',
      render: (u) => (
        <PixelTableActionIconButton
          variant="ghost"
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
            onEdit(u)
          }}
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t('admin:users.edit')}</span>
        </PixelTableActionIconButton>
      ),
    },
  ]

  return (
    <PixelTable
      columns={columns}
      data={users}
      rowKey="id"
      loading={loading}
      compact
      onRowClick={onRowClick}
      emptyText={t('admin:users.empty')}
      className="[&_tr]:cursor-pointer"
    />
  )
}
