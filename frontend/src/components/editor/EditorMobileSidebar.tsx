import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { KnowledgeGraphMini } from '../agent/KnowledgeGraphMini'
import { EditorButton } from '../ui/EditorButton'
import { EditorIcons } from './icons'
import { NovelSessionList } from './NovelSessionList'
import { MemorySidebarCard } from './MemorySidebarCard'
import { NovelSidebarCard } from './NovelSidebarCard'
import { NovelDetailModal } from '../novel/NovelDetailModal'
import { EditorSidebarProfileSection } from './EditorSidebarProfileSection'
import { EditorSidebarStoryBody } from './EditorSidebarStoryBody'
import {
  SIDEBAR_FOOTER_GROUP_GAP,
  SIDEBAR_FOOTER_INSET,
  SidebarFloatingDivider,
} from '../ui/SidebarFloatingDivider'
import type { Novel } from '@/types/novel'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_CARD } from '@/lib/editorPixelClasses'
import type { EditorSidebarCommonProps } from './editorSidebarTypes'

const EDITOR_SIDEBAR_HINT_KEY = 'na:editor-sidebar-hint-dismissed'

/** 移动端抽屉侧栏：与桌面分离，章节 Tab 含目录 + 版本历史 */
export function EditorMobileSidebar({
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
  onCloseDrawer,
}: EditorSidebarCommonProps & { onCloseDrawer?: () => void }) {
  const { t } = useTranslation(['common', 'editor'])
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(EDITOR_SIDEBAR_HINT_KEY) === '1',
  )
  const [detailNovel, setDetailNovel] = useState<Novel | null>(null)

  const isMine = centerTab === 'mine'
  const isStory = centerTab === 'story'
  const isChat = !isMine && !isStory
  const showInsightGroup = Boolean(activeNovelId) && isChat

  const novelsById = useMemo(
    () => new Map(novelSessionGroups.map((g) => [g.novel.id, g.novel])),
    [novelSessionGroups],
  )

  const handleToggleExpand = (novelId: string) => {
    onToggleNovelExpanded(novelId)
    if (novelId !== activeNovelId) {
      onSelectNovel(novelId)
    }
  }

  if (isMine) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col bg-background">
        <EditorSidebarProfileSection
          onOpenProfile={onOpenUserProfile}
          onOpenSettings={onOpenSettings}
          onOpenAvatarEditor={onOpenAvatarEditor}
        />
      </aside>
    )
  }

  return (
    <>
      <aside className="flex h-full min-h-0 w-full flex-col bg-background">
        <div className="flex min-h-[48px] shrink-0 items-center justify-between border-b-2 border-foreground px-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
            {isStory ? t('editor:outline.catalog') : t('nav.editorMyNovels')}
          </span>
          {!isStory ? (
            <EditorButton
              variant="icon"
              onClick={onNewNovel}
              title={t('nav.editorNewNovel')}
              aria-label={t('nav.editorNewNovel')}
            >
              <EditorIcons.Plus />
            </EditorButton>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 pb-2">
          {isStory ? (
            <EditorSidebarStoryBody variant="mobile" {...storySection} />
          ) : (
            <>
              {!hintDismissed && novelSessionGroups.length > 0 ? (
                <div
                  className={cn(
                    EDITOR_PIXEL_CARD,
                    'relative mb-2 shrink-0 px-2.5 py-2 pr-8 font-mono text-xs leading-snug',
                  )}
                >
                  <p className="font-bold uppercase text-foreground">{t('nav.editorQuickStart')}</p>
                  <p className="mt-0.5 text-muted-foreground">{t('nav.editorQuickStartDesc')}</p>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground hover:bg-neon/20 hover:text-foreground"
                    aria-label={t('nav.editorCloseHint')}
                    onClick={() => {
                      localStorage.setItem(EDITOR_SIDEBAR_HINT_KEY, '1')
                      setHintDismissed(true)
                    }}
                  >
                    <PixelIcons.X className="size-3.5" />
                  </button>
                </div>
              ) : null}

              <div className="mb-1 max-h-[36%] shrink-0 overflow-y-auto">
                {novelSessionGroups.length === 0 ? (
                  <div className="px-0.5 py-1.5 text-xs leading-snug text-muted-foreground/80">
                    {t('nav.editorNoNovels')}
                  </div>
                ) : (
                  novelSessionGroups.map(({ novel, sessions }) => (
                    <div key={novel.id} className="mb-0.5">
                      <NovelSidebarCard
                        novel={novel}
                        sessionCount={sessions.length}
                        sessionCountLabel={t('nav.editorSessionCount', { count: sessions.length })}
                        isActive={novel.id === activeNovelId}
                        isExpanded={expandedNovelIds.has(novel.id)}
                        showExpand
                        onOpenDetail={() => setDetailNovel(novelsById.get(novel.id) ?? novel)}
                        onToggleExpand={() => handleToggleExpand(novel.id)}
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
            </>
          )}
        </div>

        {isChat ? (
          <div
            className={cn(
              'flex shrink-0 flex-col pt-2 pb-2.5',
              SIDEBAR_FOOTER_INSET,
              SIDEBAR_FOOTER_GROUP_GAP,
            )}
          >
            {activeNovelId ? (
              <EditorButton
                variant="secondary"
                fullWidth
                onClick={() => {
                  onNewChatForNovel(activeNovelId)
                  onCloseDrawer?.()
                }}
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
                    onOpen={() => {
                      onOpenMemory()
                      onCloseDrawer?.()
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </aside>

      <NovelDetailModal
        novel={detailNovel ? (novelsById.get(detailNovel.id) ?? detailNovel) : null}
        open={detailNovel != null}
        onClose={() => setDetailNovel(null)}
        onSave={onUpdateNovel}
        onDelete={onDeleteNovel}
      />
    </>
  )
}
