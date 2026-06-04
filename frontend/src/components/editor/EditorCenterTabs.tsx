import styled from 'styled-components'
import { MotionTabBar } from '../motion/MotionTabBar'
import { editorLayout, editorTheme } from '../../styles/editorTheme'
import { EditorIcons } from './icons'

export type EditorCenterTab = 'chat' | 'story'

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
    <CenterTabBar>
      <MotionTabBar
        items={TAB_ITEMS}
        activeId={activeTab}
        onChange={onTabChange}
        aria-label="编辑区标签"
      />
    </CenterTabBar>
  )
}

const CenterTabBar = styled.div`
  display: flex;
  align-items: center;
  min-height: ${editorLayout.chromeMinHeight};
  box-sizing: border-box;
  padding: 0 ${editorLayout.mainPaddingX};
  background: ${editorTheme.bg};
  border-bottom: 1px solid ${editorTheme.border};
`
