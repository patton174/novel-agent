import type { NovelSessionGroup } from '../../hooks/editor/useEditorSessions'
import { useState } from 'react'
import { X } from 'lucide-react'
import { EditorButton } from '../ui/EditorButton'
import { KebabMenu } from '../ui/KebabMenu'
import { EditorIcons } from './icons'
import { NovelSessionBatchBar, NovelSessionList } from './NovelSessionList'
import { cn } from '@/lib/utils'

const EDITOR_SIDEBAR_HINT_KEY = 'na:editor-sidebar-hint-dismissed'

export interface EditorSidebarProps {
  sessionSearch: string
  onSessionSearchChange: (value: string) => void
  activeNovelId: string | null
  activeSession: string
  novelSessionGroups: NovelSessionGroup[]
  expandedNovelIds: Set<string>
  batchMode: boolean
  batchNovelId: string | null
  selectedSessionIds: Set<string>
  titlePendingSessionIds: Set<string>
  onToggleNovelExpanded: (novelId: string) => void
  onSelectNovel: (novelId: string) => void
  onNewChatForNovel: (novelId: string) => void
  onStartBatchForNovel: (novelId: string) => void
  onExitBatchMode: () => void
  onBatchDeleteRequest: () => void
  onSelectAllSessions: () => void
  onDeleteNovelRequest: (novelId: string, title: string) => void
  onToggleSessionSelected: (sessionId: string) => void
  onNewNovel: () => void
  onSwitchSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
  onOpenMemory: () => void
  onOpenSettings: () => void
  memoryModalOpen: boolean
  /** 营销页等嵌入预览：侧栏相对容器定位，避免 fixed 溢出 */
  embedded?: boolean
}

export function EditorSidebar({
  sessionSearch,
  onSessionSearchChange,
  activeNovelId,
  activeSession,
  novelSessionGroups,
  expandedNovelIds,
  batchMode,
  batchNovelId,
  selectedSessionIds,
  titlePendingSessionIds,
  onToggleNovelExpanded,
  onSelectNovel,
  onNewChatForNovel,
  onStartBatchForNovel,
  onExitBatchMode,
  onBatchDeleteRequest,
  onSelectAllSessions,
  onDeleteNovelRequest,
  onToggleSessionSelected,
  onNewNovel,
  onSwitchSession,
  onRenameSession,
  onDeleteSession,
  onOpenMemory,
  onOpenSettings,
  memoryModalOpen,
  embedded = false,
}: EditorSidebarProps) {
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(EDITOR_SIDEBAR_HINT_KEY) === '1',
  )

  const dismissHint = () => {
    localStorage.setItem(EDITOR_SIDEBAR_HINT_KEY, '1')
    setHintDismissed(true)
  }

  return (
    <aside
      className={cn(
        'flex min-h-0 w-[284px] flex-col border-r border-border bg-background',
        embedded ? 'relative z-[2] h-full' : 'fixed left-0 top-0 z-[100] h-screen',
        embedded ? 'max-md:flex max-md:w-full max-md:max-w-[284px]' : 'max-md:hidden',
      )}
    >
      <div className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-border px-3.5">
        <span className="text-sm font-bold tracking-tight text-foreground">我的小说</span>
        <EditorButton variant="icon" onClick={onNewNovel} title="新建小说" aria-label="新建小说">
          <EditorIcons.Plus />
        </EditorButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!hintDismissed && novelSessionGroups.length > 0 ? (
          <div className="relative mb-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-2.5 py-2 pr-8 text-[11px] leading-snug text-muted-foreground">
            <p className="font-medium text-foreground">快速开始</p>
            <p className="mt-0.5">选小说 → 点「新对话」→ 右侧写章或问 AI</p>
            <button
              type="button"
              className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="关闭提示"
              onClick={dismissHint}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
        <div className="mb-1">
          {novelSessionGroups.length === 0 ? (
            <div className="px-0.5 py-1.5 text-xs leading-snug text-muted-foreground/80">
              暂无小说，点击右上角 + 创建
            </div>
          ) : (
            novelSessionGroups.map(({ novel, sessions }) => {
              const isActiveNovel = novel.id === activeNovelId
              const isExpanded = expandedNovelIds.has(novel.id)
              const inBatch = batchMode && batchNovelId === novel.id
              const allSelected =
                sessions.length > 0 && sessions.every((s) => selectedSessionIds.has(s.id))

              const handleNovelCardClick = () => {
                onToggleNovelExpanded(novel.id)
                if (novel.id !== activeNovelId) {
                  onSelectNovel(novel.id)
                }
              }

              return (
                <div key={novel.id} className="mb-1">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-1.5 rounded-[10px] border border-transparent py-2 pl-1 pr-1.5 text-left font-[inherit] text-inherit',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                      isActiveNovel
                        ? 'border-l-[3px] border-l-primary bg-muted/50 hover:bg-muted/60'
                        : 'border-l-[3px] border-l-transparent hover:bg-muted/40',
                    )}
                    onClick={handleNovelCardClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleNovelCardClick()
                      }
                    }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'w-3.5 shrink-0 text-[11px] leading-none text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-90',
                      )}
                    >
                      ▸
                    </span>
                    <div className="flex size-[26px] shrink-0 items-center justify-center [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
                      <EditorIcons.BookOpen />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-foreground">
                        {novel.title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {sessions.length} 个对话
                      </div>
                    </div>
                    <div
                      className="ml-auto shrink-0"
                      data-novel-menu
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <KebabMenu
                        aria-label="小说操作"
                        items={[
                          {
                            id: 'new-chat',
                            label: '新对话',
                            onClick: () => onNewChatForNovel(novel.id),
                          },
                          {
                            id: 'batch',
                            label: inBatch ? '退出批量' : '批量删除对话',
                            onClick: () =>
                              inBatch ? onExitBatchMode() : onStartBatchForNovel(novel.id),
                          },
                          {
                            id: 'delete-novel',
                            label: '删除小说',
                            danger: true,
                            onClick: () => onDeleteNovelRequest(novel.id, novel.title),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="box-border w-full py-1 pl-1.5 pr-0">
                      {isActiveNovel ? (
                        <div className="box-border w-full pb-1.5">
                          <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
                            <span className="flex shrink-0 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
                              <EditorIcons.Search />
                            </span>
                            <input
                              type="search"
                              placeholder="搜索当前小说对话…"
                              aria-label="搜索当前小说对话"
                              value={sessionSearch}
                              onChange={(e) => onSessionSearchChange(e.target.value)}
                              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                      ) : null}

                      {inBatch ? (
                        <NovelSessionBatchBar
                          selectedCount={selectedSessionIds.size}
                          totalCount={sessions.length}
                          allSelected={allSelected}
                          onExitBatchMode={onExitBatchMode}
                          onSelectAll={onSelectAllSessions}
                          onBatchDelete={onBatchDeleteRequest}
                        />
                      ) : null}

                      {isActiveNovel && sessionSearch.trim() && sessions.length === 0 ? (
                        <div className="px-0.5 py-1.5 text-xs leading-snug text-muted-foreground/80">
                          无匹配对话
                        </div>
                      ) : (
                        <NovelSessionList
                          sessions={sessions}
                          activeSession={activeSession}
                          batchMode={inBatch}
                          selectedSessionIds={selectedSessionIds}
                          titlePendingSessionIds={titlePendingSessionIds}
                          onSwitchSession={(sessionId) => {
                            if (novel.id !== activeNovelId) {
                              onSelectNovel(novel.id)
                            }
                            onSwitchSession(sessionId)
                          }}
                          onToggleSessionSelected={onToggleSessionSelected}
                          onRenameSession={onRenameSession}
                          onDeleteSession={onDeleteSession}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-border p-2.5">
        {activeNovelId ? (
          <EditorButton variant="primary" fullWidth onClick={() => onNewChatForNovel(activeNovelId)}>
            <EditorIcons.Plus />
            <span>新对话</span>
          </EditorButton>
        ) : null}
        <div className="flex items-center gap-1">
          <EditorButton
            variant="nav"
            active={memoryModalOpen}
            onClick={onOpenMemory}
            className="min-w-0 flex-1"
          >
            <EditorIcons.Brain />
            <span>记忆</span>
          </EditorButton>
          <KebabMenu
            aria-label="更多工具"
            items={[
              {
                id: 'settings',
                label: '设置',
                onClick: onOpenSettings,
              },
            ]}
          />
        </div>
      </div>
    </aside>
  )
}
