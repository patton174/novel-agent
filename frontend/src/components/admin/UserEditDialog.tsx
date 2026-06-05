import { useEffect, useState } from 'react'
import type { AdminUser } from '@/api/adminApi'
import { updateUser } from '@/api/adminApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { appToast } from '@/stores/appToastStore'
import type { UserRole } from '@/stores/userStore'

interface UserEditDialogProps {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (user: AdminUser) => void
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'user', label: '普通用户' },
  { value: 'vip', label: 'VIP' },
  { value: 'admin', label: '管理员' },
]

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: UserEditDialogProps) {
  const [role, setRole] = useState<UserRole>('user')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setIsActive(user.isActive)
    }
  }, [user])

  const handleSave = async () => {
    if (!user) {
      return
    }
    setSaving(true)
    try {
      const updated = await updateUser(user.id, { role, isActive })
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '更新用户失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>
            {user ? `${user.username}（${user.email}）` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">角色</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">账号状态</p>
              <p className="text-xs text-muted-foreground">关闭后用户将无法登录</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !user}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
