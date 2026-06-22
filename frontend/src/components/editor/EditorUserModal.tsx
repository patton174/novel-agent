import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight, CreditCard, KeyRound, LogOut } from 'lucide-react'

import { fetchUserInfo } from '@/api/userApi'
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { EditorButton } from '@/components/ui/EditorButton'
import { buttonVariants } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { DIRECT_PYTHON } from '@/config/runtime'
import { isLoggedIn } from '@/utils/auth'
import { syncPixelAvatarForUser } from '@/stores/pixelAvatarStore'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'

export interface EditorUserModalProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
  onOpenAvatarEditor: () => void
}

export function EditorUserModal({ open, onClose, onLogout, onOpenAvatarEditor }: EditorUserModalProps) {
  const { t } = useTranslation(['editor', 'dashboard'])
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const showAccount = !DIRECT_PYTHON && isLoggedIn()

  const refreshProfile = useCallback(() => {
    void fetchUserInfo()
      .then(async (p) => {
        setProfile(p)
        await syncPixelAvatarForUser(p.userId)
      })
      .catch(() => {
        /* ignore */
      })
  }, [setProfile])

  useEffect(() => {
    if (!open || !showAccount) return
    refreshProfile()
  }, [open, refreshProfile, showAccount])

  if (!showAccount) {
    return null
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="settings"
      header={
        <div className="border-b border-border/60 px-4 pb-3 pt-1">
          <DialogTitle className="m-0 text-[17px] font-bold text-foreground">
            {t('editor:user.modalTitle')}
          </DialogTitle>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('editor:user.modalDesc')}</p>
        </div>
      }
      bodyClassName="space-y-4 pb-1"
    >
      <AccountSettingsPanel profile={profile} onVerified={refreshProfile} />

      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-3 border-2 border-foreground bg-muted/20 px-3 py-2.5 text-left shadow-soft',
          'transition-colors hover:border-border hover:bg-muted/35',
        )}
        onClick={() => {
          onClose()
          onOpenAvatarEditor()
        }}
      >
        <PixelAvatarFrame size={48} bordered={false}>
          <UserPixelAvatar size={44} animated />
        </PixelAvatarFrame>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground">{t('editor:avatar.sectionTitle')}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t('editor:avatar.entryHint')}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('dashboard:account.billingSection')}
        </p>
        <Link
          to="/dashboard/billing"
          onClick={onClose}
          className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full gap-1.5')}
        >
          <CreditCard className="size-4" />
          <span>{t('dashboard:account.openBilling')}</span>
        </Link>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
        <Link
          to="/forgot-password"
          onClick={onClose}
          className={cn(buttonVariants({ variant: 'secondary', size: 'default' }), 'w-full gap-1.5')}
        >
          <KeyRound className="size-4" />
          <span>{t('editor:user.changePassword')}</span>
        </Link>
        <EditorButton type="button" variant="ghost" fullWidth onClick={onLogout}>
          <LogOut className="size-4" />
          <span>{t('editor:settings.logout')}</span>
        </EditorButton>
      </div>
    </AppModalShell>
  )
}
