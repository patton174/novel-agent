import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/api/adminApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export function UserTable({ users, loading, onEdit, onRowClick }: UserTableProps) {
  if (!loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">暂无匹配用户</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
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
    </div>
  )
}
