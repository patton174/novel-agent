import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchUserPage, type AdminUser } from '@/api/adminApi'
import { UserEditDialog } from '@/components/admin/UserEditDialog'
import { UserTable } from '@/components/admin/UserTable'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { AdminPagination } from '@/components/layout/AdminPagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const debounceReady = useRef(false)

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

  useEffect(() => {
    if (!debounceReady.current) {
      debounceReady.current = true
      return
    }
    const timer = window.setTimeout(() => {
      setPageCurrent(1)
      setKeyword(searchInput.trim())
    }, 450)
    return () => window.clearTimeout(timer)
  }, [searchInput])

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
                className="pl-8 rounded-xl"
              />
            </div>
            <Button type="submit" variant="secondary" className="rounded-xl">
              搜索
            </Button>
          </form>
        </AppShellCardBody>
      </AppShellCard>

      {loading && users === null ? (
        <UserTable users={[]} loading onEdit={openEdit} onRowClick={openEdit} />
      ) : (
        <UserTable
          users={users ?? []}
          loading={false}
          onEdit={openEdit}
          onRowClick={openEdit}
        />
      )}

      <AdminPagination
        pageCurrent={pageCurrent}
        totalPages={totalPages}
        totalCount={totalCount}
        loading={loading}
        onPageChange={setPageCurrent}
      />

      <UserEditDialog
        user={editingUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />
    </AppPageStack>
  )
}
