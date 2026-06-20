import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchUserPage, type AdminUser } from '@/api/adminApi'
import { UserEditDialog } from '@/components/admin/UserEditDialog'
import { UserTable } from '@/components/admin/UserTable'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { ProPagination } from '@/components/pro/ProPagination'
import { Input } from '@/components/ui/input'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

export default function UsersPage() {
  const { t } = useTranslation(['admin'])
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
      appToast.error(err instanceof Error ? err.message : t('admin:users.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

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

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setDialogOpen(true)
  }

  const handleSaved = (updated: AdminUser) => {
    setUsers((prev) =>
      prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev,
    )
    appToast.success(t('admin:users.updated'))
  }

  return (
    <AppPageStack className="gap-4">
      <AppShellCard>
        <AppShellCardHeader title={t('admin:users.title')} description={t('admin:users.desc')} />
        <AppShellCardBody className="py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('admin:users.searchPlaceholder')}
              className="rounded-xl pl-8"
              aria-label={t('admin:users.searchPlaceholder')}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('admin:users.searchHint')}</p>
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

      <ProPagination
        page={pageCurrent}
        pageSize={PAGE_SIZE}
        total={totalCount}
        disabled={loading}
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
