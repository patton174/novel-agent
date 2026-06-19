import { useTranslation } from 'react-i18next'
import type { NovelSessionGroup } from '../../hooks/editor/useEditorSessions'
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { KnowledgeGraphMini } from '../agent/KnowledgeGraphMini'
import { EditorButton } from '../ui/EditorButton'
import { EditorIcons } from './icons'
import { NovelSessionList } from './NovelSessionList'
import { MemorySidebarCard } from './MemorySidebarCard'
import { EditorUserCard } from './EditorUserCard'
import { NovelSidebarCard } from './NovelSidebarCard'
import { NovelDetailModal } from '../novel/NovelDetailModal'
import { SidebarContentSwitch } from './SidebarContentSwitch'
import {
  EditorSidebarStorySection,
  type EditorSidebarStorySectionProps,
} from './EditorSidebarStorySection'
import {
  SIDEBAR_FOOTER_GROUP_GAP,
  SIDEBAR_FOOTER_INSET,
  SidebarFloatingDivider,
} from '../ui/SidebarFloatingDivider'
import type { MemoryRootTab } from '@/types/memoryNode'
import type { CreateNovelPayload, Novel } from '@/types/novel'
import type { EditorCenterTab } from './EditorCenterTabs.types'
import { DIRECT_PYTHON } from '@/config/runtime'
import { isLoggedIn } from '@/utils/auth'
import { cn } from '@/lib/utils'

const EDITOR_SIDEBAR_HINT_KEY = 'na:editor-sidebar-hint-dismissed'

export interface EditorSidebarProps {
  centerTab: EditorCenterTab
  activeNovelId: string | null
  activeSession: string
  runningSessionId?: string | null
  novelSessionGroups: NovelSessionGroup[]
  expandedNovelIds: Set<string>
  titlePendingSessionIds: Set<string>
  onToggleNovelExpanded: (novelId: string) => void
  onSelectNovel: (novelId: string) => void
  onNewChatForNovel: (novelId: string) => void
  onDeleteNovel: (novelId: string) => Promise<void>
  onUpdateNovel: (novelId: string, payload: CreateNovelPayload) => Promise<void>
  onNewNovel: () => void
  onSwitchSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
  onOpenMemory: () => void
  onOpenSettings: () => void
  onOpenUserProfile: () => void
  onOpenAvatarEditor: () => void
  memoryModalOpen: boolean
  memoryTabs: MemoryRootTab[]
  storySection: EditorSidebarStorySectionProps
  embedded?: boolean
}

export function EditorSidebar({
  centerTab,
  activeNovelId,
  activeSession,
  runningSessionId = null,
  novelSessionGroups,
  expandedNovelIds,
  titlePendingSessionIds,
  onToggleNovelExpanded,
  onSelectNovel,
  onNewChatForNovel,
  onDeleteNovel,
  onUpdateNovel,
  onNewNovel,
  onSwitchSession,
  onRenameSession,
  onDeleteSession,
  onOpenMemory,
  onOpenSettings,
  onOpenUserProfile,
  onOpenAvatarEditor,
  memoryModalOpen,
  memoryTabs,
  storySection,
  embedded = false,
}: EditorSidebarProps) {
  const { t } = useTranslation(['common', 'editor'])
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(EDITOR_SIDEBAR_HINT_KEY) === '1',
  )
  const [detailNovel, setDetailNovel] = useState<Novel | null>(null)

  const detailOpen = detailNovel != null
  const novelsById = useMemo(
    () => new Map(novelSessionGroups.map((g) => [g.novel.id, g.novel])),
    [novelSessionGroups],
  )

  const dismissHint = () => {
    localStorage.setItem(EDITOR_SIDEBAR_HINT_KEY, '1')
    setHintDismissed(true)
  }

  const showInsightGroup = Boolean(activeNovelId)
  const showUserCard = !DIRECT_PYTHON && isLoggedIn()

  const handleToggleExpand = (novelId: string) => {
    onToggleNovelExpanded(novelId)
    if (novelId !== activeNovelId) {
      onSelectNovel(novelId)
    }
  }

  const chatPanel = (
    <div className="pb-1 pt-0.5">
      {novelSessionGroups.map(({ novel, sessions }) => {
        if (!expandedNovelIds.has(novel.id)) return null
        return (
          <NovelSessionList
            key={novel.id}
            sessions={sessions}
            activeSession={activeSession}
            runningSessionId={runningSessionId}
            titlePendingSessionIds={titlePendingSessionIds}
            onSwitchSession={(sessionId) => {
              if (novel.id !== activeNovelId) {
                onSelectNovel(novel.id)
              }
              onSwitchSession(sessionId)
            }}
            onRenameSession={onRenameSession}
            onDeleteSession={onDeleteSession}
          />
        )
      })}
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'flex min-h-0 w-[284px] flex-col border-r border-border bg-background',
          embedded ? 'relative z-[2] h-full' : 'fixed left-0 top-0 z-[100] h-screen',
          embedded ? 'max-md:flex max-md:w-full max-md:max-w-[284px]' : 'max-md:hidden',
        )}
      >
        <div className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-border px-3.5">
          <span className="text-sm font-bold tracking-tight text-foreground">
            {t('nav.editorMyNovels')}
          </span>
          <EditorButton
            variant="icon"
            onClick={onNewNovel}
            title={t('nav.editorNewNovel')}
            aria-label={t('nav.editorNewNovel')}
          >
            <EditorIcons.Plus />
          </EditorButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 pb-2">
          {!hintDismissed && novelSessionGroups.length > 0 && centerTab === 'chat' ? (
            <div className="relative mb-2 shrink-0 rounded-md border border-border bg-muted/30 px-2.5 py-2 pr-8 text-xs leading-snug text-muted-foreground">
              <p className="font-medium text-foreground">{t('nav.editorQuickStart')}</p>
              <p className="mt-0.5">{t('nav.editorQuickStartDesc')}</p>
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('nav.editorCloseHint')}
                onClick={dismissHint}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          <div className="mb-1 shrink-0">
            {novelSessionGroups.length === 0 ? (
              <div className="px-0.5 py-1.5 text-xs leading-snug text-muted-foreground/80">
                {t('nav.editorNoNovels')}
              </div>
            ) : (
              novelSessionGroups.map(({ novel, sessions }) => {
                const isActiveNovel = novel.id === activeNovelId
                const isExpanded = expandedNovelIds.has(novel.id)

                return (
                  <div key={novel.id} className="mb-0.5">
                    <NovelSidebarCard
                      novel={novel}
                      sessionCount={sessions.length}
                      sessionCountLabel={t('nav.editorSessionCount', { count: sessions.length })}
                      isActive={isActiveNovel}
                      isExpanded={centerTab === 'chat' && isExpanded}
                      showExpand={centerTab === 'chat'}
                      onOpenDetail={() => setDetailNovel(novelsById.get(novel.id) ?? novel)}
                      onToggleExpand={() => handleToggleExpand(novel.id)}
                    />
                  </div>
                )
              })
            )}
          </div>

          <SidebarContentSwitch
            mode={centerTab}
            className="min-h-0 flex-1"
            chat={chatPanel}
            story={<EditorSidebarStorySection {...storySection} />}
          />
        </div>

        <div
          className={cn(
            'flex shrink-0 flex-col pt-2 pb-2.5',
            SIDEBAR_FOOTER_INSET,
            SIDEBAR_FOOTER_GROUP_GAP,
          )}
        >
          {activeNovelId && centerTab === 'chat' ? (
            <EditorButton
              variant="secondary"
              fullWidth
              onClick={() => onNewChatForNovel(activeNovelId)}
            >
              <EditorIcons.Plus />
              <span>{t('nav.editorNewChat')}</span>
            </EditorButton>
          ) : null}

          {showInsightGroup ? (
            <>
              <SidebarFloatingDivider />
              <div className="flex flex-col gap-1.5">
                <KnowledgeGraphMini novelId={activeNovelId} />
                <MemorySidebarCard
                  tabs={memoryTabs}
                  active={memoryModalOpen}
                  onOpen={onOpenMemory}
                />
              </div>
            </>
          ) : null}

          {showUserCard ? (
            <>
              <SidebarFloatingDivider />
              <EditorUserCard
                onOpenProfile={onOpenUserProfile}
                onOpenSettings={onOpenSettings}
                onOpenAvatarEditor={onOpenAvatarEditor}
              />
            </>
          ) : null}
        </div>
      </aside>

      <NovelDetailModal
        novel={detailNovel ? (novelsById.get(detailNovel.id) ?? detailNovel) : null}
        open={detailOpen}
        onClose={() => setDetailNovel(null)}
        onSave={onUpdateNovel}
        onDelete={onDeleteNovel}
      />
    </>
  )
}
