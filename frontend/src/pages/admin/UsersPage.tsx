import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchUserPage, type AdminUser } from '@/api/adminApi'
import { UserEditDialog } from '@/components/admin/UserEditDialog'
import { UserTable } from '@/components/admin/UserTable'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContentPending } from '@/components/loading/ContentPending'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

export default function UsersPage() {
  useMarkRouteSeen()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pageCurrent, setPageCurrent] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadUsers = useCallback(async (page: number, usernameKeyword: string) => {
    setLoading(true)
    try {
      const data = await fetchUserPage({
        pageCurrent: page,
        pageSize: PAGE_SIZE,
        usernameKeyword,
      })
      setUsers(data.list)
      setTotalCount(data.totalCount)
      setPageCurrent(data.pageCurrent)
    } catch (err) {
      setUsers([])
      setTotalCount(0)
      appToast.error(err instanceof Error ? err.message : '加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers(pageCurrent, keyword)
  }, [loadUsers, pageCurrent, keyword])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPageCurrent(1)
    setKeyword(searchInput.trim())
  }

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setDialogOpen(true)
  }

  const handleSaved = (updated: AdminUser) => {
    setUsers((prev) =>
      prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev,
    )
    appToast.success('用户已更新')
  }

  return (
    <AppPageStack className="gap-4">
      <AppShellCard>
        <AppShellCardHeader title="用户列表" description="按用户名搜索并编辑角色、配额" />
        <AppShellCardBody className="py-4">
          <form onSubmit={handleSearch} className="flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="按用户名搜索"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              搜索
            </Button>
          </form>
        </AppShellCardBody>
      </AppShellCard>

      {loading && users === null ? (
        <ContentPending label="正在加载用户列表" />
      ) : (
        <UserTable
          users={users ?? []}
          loading={loading}
          onEdit={openEdit}
          onRowClick={openEdit}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          共 {totalCount.toLocaleString('zh-CN')} 条，第 {pageCurrent} / {totalPages} 页
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pageCurrent <= 1 || loading}
            onClick={() => setPageCurrent((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pageCurrent >= totalPages || loading}
            onClick={() => setPageCurrent((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      <UserEditDialog
        user={editingUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />
    </AppPageStack>
  )
}
