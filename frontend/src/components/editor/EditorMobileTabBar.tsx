import { useTranslation } from 'react-i18next'
import { IconStroke } from '@/components/pro/IconStroke'
import {
  ProIconAccount,
  ProIconNovel,
  ProIconPencil,
  type ProIconProps,
} from '@/components/pro/icons/proIcons'
import { cn } from '@/lib/utils'
import type { EditorCenterTab } from './EditorCenterTabs.types'

export interface EditorMobileTabBarProps {
  activeTab: EditorCenterTab
  onTabChange: (tab: EditorCenterTab) => void
  hidden?: boolean
}

type ProIconComponent = (props: ProIconProps) => JSX.Element

const TAB_ITEMS: {
  id: EditorCenterTab
  labelKey: 'editor:tabs.chat' | 'editor:tabs.story' | 'editor:tabs.mine'
  icon: ProIconComponent
}[] = [
  { id: 'chat', labelKey: 'editor:tabs.chat', icon: ProIconPencil },
  { id: 'story', labelKey: 'editor:tabs.story', icon: ProIconNovel },
  { id: 'mine', labelKey: 'editor:tabs.mine', icon: ProIconAccount },
]

/** 编辑器移动端底栏 — 视觉与仪表盘 {@link ProTabBar} 对齐 */
export function EditorMobileTabBar({ activeTab, onTabChange, hidden = false }: EditorMobileTabBarProps) {
  const { t } = useTranslation(['editor'])

  return (
    <nav
      aria-label={t('editor:tabs.mobileBarAria')}
      data-testid="editor-mobile-tab-bar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t-2 border-black bg-white transition-transform duration-200 ease-out md:hidden',
        hidden && 'pointer-events-none translate-y-full',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TAB_ITEMS.map((item) => {
        const active = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 border-r-2 border-black/10 py-2 font-mono text-[0.68rem] font-bold uppercase tracking-wide transition-colors last:border-r-0',
              active ? 'bg-neon text-ink' : 'text-ink/70',
            )}
            onClick={() => onTabChange(item.id)}
          >
            <IconStroke icon={item.icon} active={active} size={22} />
            <span>{t(item.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
