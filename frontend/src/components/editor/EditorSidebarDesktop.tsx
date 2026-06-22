import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { KnowledgeGraphMini } from '../agent/KnowledgeGraphMini'
import { EditorButton } from '../ui/EditorButton'
import { EditorIcons } from './icons'
import { NovelSessionList } from './NovelSessionList'
import { MemorySidebarCard } from './MemorySidebarCard'
import { EditorUserCard } from './EditorUserCard'
import { NovelSidebarCard } from './NovelSidebarCard'
import { NovelDetailModal } from '../novel/NovelDetailModal'
import { EditorSidebarStoryBody } from './EditorSidebarStoryBody'
import {
  SIDEBAR_FOOTER_GROUP_GAP,
  SIDEBAR_FOOTER_INSET,
  SidebarFloatingDivider,
} from '../ui/SidebarFloatingDivider'
import type { Novel } from '@/types/novel'
import { DIRECT_PYTHON } from '@/config/runtime'
import { isLoggedIn } from '@/utils/auth'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_SIDEBAR, EDITOR_PIXEL_CARD } from '@/lib/editorPixelClasses'
import type { EditorSidebarCommonProps } from './editorSidebarTypes'

const EDITOR_SIDEBAR_HINT_KEY = 'na:editor-sidebar-hint-dismissed'

/** 桌面端固定侧栏：聊天 / 章节分栏，底部始终显示用户卡片 */
export function EditorSidebarDesktop({
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
}: EditorSidebarCommonProps) {
  const { t } = useTranslation(['common', 'editor'])
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(EDITOR_SIDEBAR_HINT_KEY) === '1',
  )
  const [detailNovel, setDetailNovel] = useState<Novel | null>(null)

  const isStory = centerTab === 'story'
  const showUserCard = !DIRECT_PYTHON && isLoggedIn()
  const showInsightGroup = Boolean(activeNovelId) && !isStory

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

  return (
    <>
      <aside className={cn(EDITOR_PIXEL_SIDEBAR, 'fixed left-0 top-0 z-[100] h-screen max-md:hidden')}>
        <div className="flex min-h-[52px] shrink-0 items-center justify-between border-b-2 border-foreground px-3.5">
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
            <EditorSidebarStoryBody variant="desktop" {...storySection} />
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
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null}

              <div className="mb-1 max-h-[38%] shrink-0 overflow-y-auto">
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

        <div
          className={cn(
            'flex shrink-0 flex-col pt-2 pb-2.5',
            SIDEBAR_FOOTER_INSET,
            SIDEBAR_FOOTER_GROUP_GAP,
          )}
        >
          {activeNovelId && !isStory ? (
            <EditorButton variant="secondary" fullWidth onClick={() => onNewChatForNovel(activeNovelId)}>
              <EditorIcons.Plus />
              <span>{t('nav.editorNewChat')}</span>
            </EditorButton>
          ) : null}

          {showInsightGroup ? (
            <>
              <SidebarFloatingDivider />
              <div className="flex flex-col gap-1.5">
                <KnowledgeGraphMini novelId={activeNovelId} />
                <MemorySidebarCard tabs={memoryTabs} active={memoryModalOpen} onOpen={onOpenMemory} />
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
        open={detailNovel != null}
        onClose={() => setDetailNovel(null)}
        onSave={onUpdateNovel}
        onDelete={onDeleteNovel}
      />
    </>
  )
}
