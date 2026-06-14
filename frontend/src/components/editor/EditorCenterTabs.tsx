import { useTranslation } from 'react-i18next'
import { MotionTabBar } from '../motion/MotionTabBar'
import { editorLayout } from '../../styles/theme'
import { EditorIcons } from './icons'
import type { EditorCenterTab } from './EditorCenterTabs.types'

export type { EditorCenterTab } from './EditorCenterTabs.types'

export interface EditorCenterTabsProps {
  activeTab: EditorCenterTab
  onTabChange: (tab: EditorCenterTab) => void
}

export function EditorCenterTabs({ activeTab, onTabChange }: EditorCenterTabsProps) {
  const { t } = useTranslation(['editor'])

  const TAB_ITEMS = [
    { id: 'chat' as const, label: t('editor:tabs.chat'), icon: <EditorIcons.MessageCircle /> },
    { id: 'story' as const, label: t('editor:tabs.story'), icon: <EditorIcons.BookOpen /> },
  ]

  return (
    <div
      className="box-border flex items-center border-b border-border bg-background"
      style={{ minHeight: editorLayout.chromeMinHeight, padding: `0 ${editorLayout.mainPaddingX}` }}
    >
      <MotionTabBar
        items={TAB_ITEMS}
        activeId={activeTab}
        onChange={onTabChange}
        aria-label={t('editor:tabs.ariaLabel')}
      />
    </div>
  )
}
