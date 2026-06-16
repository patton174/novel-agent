import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MotionTabBar } from '../motion/MotionTabBar'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { editorLayout } from '../../styles/theme'
import { EditorIcons } from './icons'
import type { EditorCenterTab } from './EditorCenterTabs.types'
import { cn } from '@/lib/utils'

export type { EditorCenterTab } from './EditorCenterTabs.types'

export interface EditorCenterTabsProps {
  activeTab: EditorCenterTab
  onTabChange: (tab: EditorCenterTab) => void
}

export function EditorCenterTabs({ activeTab, onTabChange }: EditorCenterTabsProps) {
  const { t } = useTranslation(['editor', 'common'])

  const tabItems = useMemo(
    () => [
      { id: 'chat' as const, label: t('editor:tabs.chat'), icon: <EditorIcons.MessageCircle /> },
      { id: 'story' as const, label: t('editor:tabs.story'), icon: <EditorIcons.BookOpen /> },
    ],
    [t],
  )

  return (
    <div
      className="box-border flex items-center justify-between gap-3 border-b border-border bg-background"
      style={{ minHeight: editorLayout.chromeMinHeight, padding: `0 ${editorLayout.mainPaddingX}` }}
    >
      <MotionTabBar
        items={tabItems}
        activeId={activeTab}
        onChange={onTabChange}
        aria-label={t('editor:tabs.ariaLabel')}
      />
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          to="/dashboard"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5',
            'text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-sm',
          )}
          title={t('editor:chrome.backToDashboard')}
        >
          <LayoutDashboard className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">{t('editor:chrome.backToDashboard')}</span>
        </Link>
        <ThemeToggle compact />
        <LocaleToggle compact />
      </div>
    </div>
  )
}
