import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import type { UserProfile } from '@/stores/userStore'

interface AccountSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile | null
  onProfileRefresh?: () => void
}

export function AccountSettingsModal({
  open,
  onOpenChange,
  profile,
  onProfileRefresh,
}: AccountSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>账户设置</DialogTitle>
          <DialogDescription>管理账户信息与邮箱验证状态</DialogDescription>
        </DialogHeader>
        <AccountSettingsPanel profile={profile} onVerified={onProfileRefresh} />
      </DialogContent>
    </Dialog>
  )
}
