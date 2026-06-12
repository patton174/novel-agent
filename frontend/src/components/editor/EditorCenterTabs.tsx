import { MotionTabBar } from '../motion/MotionTabBar'
import { editorLayout } from '../../styles/theme'
import { EditorIcons } from './icons'
import type { EditorCenterTab } from './EditorCenterTabs.types'

export type { EditorCenterTab } from './EditorCenterTabs.types'

export interface EditorCenterTabsProps {
  activeTab: EditorCenterTab
  onTabChange: (tab: EditorCenterTab) => void
}

const TAB_ITEMS = [
  { id: 'chat' as const, label: '聊天', icon: <EditorIcons.MessageCircle /> },
  { id: 'story' as const, label: '章节编辑', icon: <EditorIcons.BookOpen /> },
]

export function EditorCenterTabs({ activeTab, onTabChange }: EditorCenterTabsProps) {
  return (
    <div
      className="box-border flex items-center border-b border-border bg-background"
      style={{ minHeight: editorLayout.chromeMinHeight, padding: `0 ${editorLayout.mainPaddingX}` }}
    >
      <MotionTabBar
        items={TAB_ITEMS}
        activeId={activeTab}
        onChange={onTabChange}
        aria-label="编辑区标签"
      />
    </div>
  )
}
