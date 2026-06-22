import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProIconOverview } from '@/components/pro/icons/proIcons'
import { EditorUserCard, type EditorUserCardProps } from '@/components/editor/EditorUserCard'
import { SidebarFloatingDivider, SIDEBAR_FOOTER_INSET } from '@/components/ui/SidebarFloatingDivider'
import { DIRECT_PYTHON } from '@/config/runtime'
import { isLoggedIn } from '@/utils/auth'
import { editorPixelButtonClass } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

export function EditorSidebarProfileSection({
  onOpenProfile,
  onOpenSettings,
  onOpenAvatarEditor,
}: EditorUserCardProps) {
  const { t } = useTranslation(['editor'])
  const showUserCard = !DIRECT_PYTHON && isLoggedIn()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center px-2 py-2">
        <Link
          to="/dashboard"
          className={cn(
            editorPixelButtonClass(false),
            'h-auto w-full justify-start gap-2.5 px-2.5 py-2 normal-case',
          )}
        >
          <ProIconOverview size={16} className="shrink-0" />
          <span className="flex min-w-0 flex-col items-start gap-0.5 text-left leading-snug">
            <span className="text-xs font-bold text-foreground">
              {t('editor:chrome.backToDashboard')}
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {t('editor:profile.sidebarDashboardHint')}
            </span>
          </span>
        </Link>
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className={cn('mt-auto shrink-0 pb-2.5', SIDEBAR_FOOTER_INSET)}>
        <SidebarFloatingDivider className="mb-3" />
        {showUserCard ? (
          <EditorUserCard
            onOpenProfile={onOpenProfile}
            onOpenSettings={onOpenSettings}
            onOpenAvatarEditor={onOpenAvatarEditor}
          />
        ) : (
          <p className="px-1 py-2 font-mono text-xs text-muted-foreground">
            {t('editor:profile.sidebarGuestHint')}
          </p>
        )}
      </div>
    </div>
  )
}
