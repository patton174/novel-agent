import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/api/adminApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'

interface UserTableProps {
  users: AdminUser[]
  loading: boolean
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}

/** 管理后台用户列表：基于 ProTable 的桌面表格（移动端 overflow-x-auto，后台不强制分端）。 */
export function UserTable({ users, loading, onEdit, onRowClick }: UserTableProps) {
  const { t } = useTranslation(['admin'])
  const ROLE_LABELS: Record<string, string> = {
    user: t('admin:users.roleUser'),
    vip: t('admin:users.roleVip'),
    admin: t('admin:users.roleAdmin'),
  }

  const columns: ProColumn<AdminUser>[] = [
    { key: 'id', header: t('admin:users.colId'), className: 'tabular-nums', render: (u) => u.id },
    { key: 'username', header: t('admin:users.colUsername'), className: 'font-medium', render: (u) => u.username },
    { key: 'email', header: t('admin:users.colEmail'), className: 'max-w-[200px] truncate', render: (u) => u.email },
    {
      key: 'role',
      header: t('admin:users.colRole'),
      render: (u) => <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>,
    },
    {
      key: 'status',
      header: t('admin:users.colStatus'),
      render: (u) => (
        <Badge variant={u.isActive ? 'secondary' : 'destructive'}>
          {u.isActive ? t('admin:users.statusActive') : t('admin:users.statusDisabled')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('admin:users.colActions'),
      align: 'right',
      render: (u) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(u)
          }}
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t('admin:users.edit')}</span>
        </Button>
      ),
    },
  ]

  return (
    <ProTable
      columns={columns}
      data={users}
      rowKey="id"
      loading={loading}
      onRowClick={onRowClick}
      emptyText={t('admin:users.empty')}
      className="[&_tr]:cursor-pointer"
    />
  )
}
