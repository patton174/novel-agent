import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_MODAL_FORM } from '@/lib/appModalClasses'
import { cn } from '@/lib/utils'
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
      <DialogContent className={cn('sm:max-w-md', APP_MODAL_FORM)}>
        <DialogHeader>
          <DialogTitle>账户设置</DialogTitle>
          <DialogDescription>管理账户信息与邮箱验证状态</DialogDescription>
        </DialogHeader>
        <AccountSettingsPanel profile={profile} onVerified={onProfileRefresh} />
      </DialogContent>
    </Dialog>
  )
}
