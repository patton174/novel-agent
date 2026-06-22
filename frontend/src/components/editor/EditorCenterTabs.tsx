import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MotionTabBar } from '../motion/MotionTabBar'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ProIconOverview } from '@/components/pro/icons/proIcons'
import { editorLayout } from '../../styles/theme'
import { EditorIcons } from './icons'
import type { EditorCenterTab } from './EditorCenterTabs.types'
import { editorPixelButtonClass } from '@/lib/editorPixelClasses'
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
      className="box-border hidden md:flex md:items-center md:justify-between md:gap-3 md:border-b-2 md:border-foreground md:bg-background"
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
          className={cn(editorPixelButtonClass(false), 'h-8 gap-1.5 px-2.5 normal-case')}
          title={t('editor:chrome.backToDashboard')}
        >
          <ProIconOverview size={14} className="shrink-0" />
          <span className="hidden sm:inline">{t('editor:chrome.backToDashboard')}</span>
        </Link>
        <ThemeToggle compact />
        <LocaleToggle compact />
      </div>
    </div>
  )
}
