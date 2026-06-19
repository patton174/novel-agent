import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'

import { fetchUserInfo } from '@/api/userApi'
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
import { syncPixelAvatarForUser } from '@/stores/pixelAvatarStore'
import { useUserStore } from '@/stores/userStore'
import { isLoggedIn } from '@/utils/auth'
import { DIRECT_PYTHON } from '@/config/runtime'
import { EditorButton } from '../ui/EditorButton'
import { cn } from '@/lib/utils'

export interface EditorUserCardProps {
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenAvatarEditor: () => void
}

export function EditorUserCard({ onOpenProfile, onOpenSettings, onOpenAvatarEditor }: EditorUserCardProps) {
  const { t } = useTranslation(['editor'])
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
    if (!showAccount) return
    refreshProfile()
  }, [refreshProfile, showAccount])

  if (!showAccount) {
    return null
  }

  const displayName = profile?.username?.trim() || t('editor:user.guest')
  const subtitle = profile?.email?.trim() || t('editor:user.tapForAccount')

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="editor-user-card"
      onClick={onOpenProfile}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenProfile()
        }
      }}
      className={cn(
        'group flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2',
        'bg-gradient-to-r from-muted/50 via-muted/30 to-transparent',
        'ring-1 ring-border/40 transition-colors hover:from-muted/65 hover:via-muted/40',
      )}
    >
      <PixelAvatarFrame
        type="button"
        size={40}
        aria-label={t('editor:avatar.openEditor')}
        title={t('editor:avatar.openEditor')}
        onClick={(e) => {
          e.stopPropagation()
          onOpenAvatarEditor()
        }}
      >
        <UserPixelAvatar size={36} animated />
      </PixelAvatarFrame>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold leading-tight text-foreground">
          {displayName}
        </div>
        <div className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
          {subtitle}
        </div>
      </div>
      <EditorButton
        type="button"
        variant="icon"
        className="size-7 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
        aria-label={t('editor:user.openSettings')}
        title={t('editor:user.openSettings')}
        onClick={(e) => {
          e.stopPropagation()
          onOpenSettings()
        }}
      >
        <Settings className="size-3.5" />
      </EditorButton>
    </div>
  )
}
