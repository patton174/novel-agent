import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/api/adminApi'
import { DataTableFrame } from '@/components/layout/DataTableFrame'
import { AppShellCard } from '@/components/layout/AppPageStack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { APP_BTN } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  vip: 'VIP',
  admin: '管理员',
}

interface UserTableProps {
  users: AdminUser[]
  loading?: boolean
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}

function UserMobileCard({
  user,
  onEdit,
  onRowClick,
}: {
  user: AdminUser
  onEdit: (user: AdminUser) => void
  onRowClick: (user: AdminUser) => void
}) {
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
          编辑
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">ID {user.id}</span>
        <Badge variant="outline" className="text-[11px]">
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
        <Badge variant={user.isActive ? 'secondary' : 'destructive'} className="text-[11px]">
          {user.isActive ? '正常' : '已禁用'}
        </Badge>
      </div>
    </button>
  )
}

export function UserTable({ users, loading, onEdit, onRowClick }: UserTableProps) {
  if (!loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">暂无匹配用户</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          : users.map((user) => (
              <UserMobileCard key={user.id} user={user} onEdit={onEdit} onRowClick={onRowClick} />
            ))}
      </div>

      <AppShellCard className="hidden md:block">
        <DataTableFrame embedded scrollHint={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full max-w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => onRowClick(user)}
                    >
                      <TableCell className="tabular-nums">{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'secondary' : 'destructive'}>
                          {user.isActive ? '正常' : '已禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(user)
                          }}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">编辑</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      </AppShellCard>
    </>
  )
}
