import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/api/adminApi'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/layout/ResponsiveTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { APP_BTN } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'

function UserMobileCard({
  user,
  onEdit,
  onRowClick,
}: {
  user: AdminUser
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}) {
  const { t } = useTranslation(['admin'])
  const ROLE_LABELS: Record<string, string> = {
    user: t('admin:users.roleUser'),
    vip: t('admin:users.roleVip'),
    admin: t('admin:users.roleAdmin'),
  }

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-border/70 bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-hover"
      onClick={() => onRowClick(user)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{user.username}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email || '—'}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-8 shrink-0 px-2.5 text-xs ${APP_BTN}`}
          onClick={(e) => {
            e.stopPropagation()
            onEdit(user)
          }}
        >
          <Pencil className="mr-1 size-3.5" />
          {t('admin:users.edit')}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">ID {user.id}</span>
        <Badge variant="outline" className="text-[11px]">
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
        <Badge variant={user.isActive ? 'secondary' : 'destructive'} className="text-[11px]">
          {user.isActive ? t('admin:users.statusActive') : t('admin:users.statusDisabled')}
        </Badge>
      </div>
    </button>
  )
}

interface UserTableProps {
  users: AdminUser[]
  loading: boolean
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}

export function UserTable({ users, loading, onEdit, onRowClick }: UserTableProps) {
  const { t } = useTranslation(['admin'])
  const ROLE_LABELS: Record<string, string> = {
    user: t('admin:users.roleUser'),
    vip: t('admin:users.roleVip'),
    admin: t('admin:users.roleAdmin'),
  }

  const columns: ResponsiveTableColumn<AdminUser>[] = [
    {
      key: 'id',
      header: t('admin:users.colId'),
      cellClassName: 'tabular-nums',
      renderCell: (user) => user.id,
    },
    {
      key: 'username',
      header: t('admin:users.colUsername'),
      cellClassName: 'font-medium',
      renderCell: (user) => user.username,
    },
    {
      key: 'email',
      header: t('admin:users.colEmail'),
      cellClassName: 'max-w-[200px] truncate',
      renderCell: (user) => user.email,
    },
    {
      key: 'role',
      header: t('admin:users.colRole'),
      renderCell: (user) => <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>,
    },
    {
      key: 'status',
      header: t('admin:users.colStatus'),
      renderCell: (user) => (
        <Badge variant={user.isActive ? 'secondary' : 'destructive'}>
          {user.isActive ? t('admin:users.statusActive') : t('admin:users.statusDisabled')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('admin:users.colActions'),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      renderCell: (user) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(user)
          }}
        >
          <Pencil className="size-4" />
          <span className="sr-only">{t('admin:users.edit')}</span>
        </Button>
      ),
    },
  ]

  return (
    <ResponsiveTable
      columns={columns}
      rows={users}
      loading={loading}
      getRowKey={(user) => user.id}
      renderMobileCard={(user) => <UserMobileCard user={user} onEdit={onEdit} onRowClick={onRowClick} />}
      renderLoadingMobileCard={(index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />}
      tableRowClassName="cursor-pointer"
      onDesktopRowClick={(user) => onRowClick(user)}
      emptyState={
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('admin:users.empty')}</p>
        </div>
      }
    />
  )
}
