import styled from 'styled-components'
import type { NovelSessionGroup } from '../../hooks/editor/useEditorSessions'
import { editorLayout, editorTheme } from '../../styles/editorTheme'
import { hideScrollbarCss, palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import { KebabMenu } from '../ui/KebabMenu'
import { EditorIcons } from './icons'
import { NovelSessionBatchBar, NovelSessionList } from './NovelSessionList'

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
  return (
    <LeftSidebar $embedded={embedded}>
      <SidebarHeader>
        <HeaderTitle>我的小说</HeaderTitle>
        <EditorButton variant="icon" onClick={onNewNovel} title="新建小说" aria-label="新建小说">
          <EditorIcons.Plus />
        </EditorButton>
      </SidebarHeader>

      <SessionList>
        <SessionSection>
          {novelSessionGroups.length === 0 ? (
            <EmptyHint>暂无小说，点击右上角 + 创建</EmptyHint>
          ) : (
            novelSessionGroups.map(({ novel, sessions }) => {
              const isActiveNovel = novel.id === activeNovelId
              const isExpanded = expandedNovelIds.has(novel.id)
              const inBatch = batchMode && batchNovelId === novel.id
              const allSelected =
                sessions.length > 0 &&
                sessions.every((s) => selectedSessionIds.has(s.id))

              const handleNovelCardClick = () => {
                onToggleNovelExpanded(novel.id)
                if (novel.id !== activeNovelId) {
                  onSelectNovel(novel.id)
                }
              }

              return (
                <NovelBlock key={novel.id}>
                  <NovelCard
                    role="button"
                    tabIndex={0}
                    $active={isActiveNovel}
                    aria-expanded={isExpanded}
                    onClick={handleNovelCardClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleNovelCardClick()
                      }
                    }}
                  >
                    <Chevron $expanded={isExpanded} aria-hidden>
                      ▸
                    </Chevron>
                    <SessionIcon>
                      <EditorIcons.BookOpen />
                    </SessionIcon>
                    <SessionInfo>
                      <SessionTitle>{novel.title}</SessionTitle>
                      <SessionTime>{sessions.length} 个对话</SessionTime>
                    </SessionInfo>
                    <NovelActions
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
                    </NovelActions>
                  </NovelCard>

                  {isExpanded ? (
                    <SessionNest>
                      {isActiveNovel ? (
                        <NestSearch>
                          <SearchBar>
                            <EditorIcons.Search />
                            <input
                              type="search"
                              placeholder="搜索当前小说对话…"
                              aria-label="搜索当前小说对话"
                              value={sessionSearch}
                              onChange={(e) => onSessionSearchChange(e.target.value)}
                            />
                          </SearchBar>
                        </NestSearch>
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
                        <EmptyHint>无匹配对话</EmptyHint>
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
                    </SessionNest>
                  ) : null}
                </NovelBlock>
              )
            })
          )}
        </SessionSection>
      </SessionList>

      <SidebarFooter>
        <EditorButton variant="nav" active={memoryModalOpen} onClick={onOpenMemory}>
          <EditorIcons.Brain />
          <span>记忆管理</span>
        </EditorButton>
        <EditorButton variant="nav" onClick={onOpenSettings}>
          <EditorIcons.Settings />
          <span>设置</span>
        </EditorButton>
      </SidebarFooter>
    </LeftSidebar>
  )
}

const LeftSidebar = styled.aside<{ $embedded?: boolean }>`
  width: ${editorLayout.sidebarWidthPx}px;
  height: ${({ $embedded }) => ($embedded ? '100%' : '100vh')};
  background: ${editorTheme.bgSidebar};
  display: flex;
  flex-direction: column;
  position: ${({ $embedded }) => ($embedded ? 'absolute' : 'fixed')};
  left: 0;
  top: 0;
  z-index: ${({ $embedded }) => ($embedded ? 2 : 100)};
  border-right: 1px solid ${editorTheme.border};
  min-height: 0;
`

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  box-sizing: border-box;
  padding: 0 0.85rem;
  border-bottom: 1px solid ${editorTheme.border};
  flex-shrink: 0;
`

const HeaderTitle = styled.span`
  font-size: 0.88rem;
  font-weight: 700;
  color: ${editorTheme.text};
  letter-spacing: -0.2px;
`

const SessionList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.35rem 0.4rem 0.5rem;
  ${hideScrollbarCss}
`

const SessionSection = styled.div`
  margin-bottom: 0.25rem;
`

const NovelBlock = styled.div`
  margin-bottom: 0.25rem;
`

const NovelCard = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.45rem 0.5rem 0.35rem;
  margin: 0;
  border-radius: 10px;
  border: 1px solid transparent;
  border-left: 3px solid ${(p) => (p.$active ? editorTheme.accent : 'transparent')};
  background: ${(p) => (p.$active ? 'rgba(0, 0, 0, 0.04)' : 'transparent')};
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  &:hover {
    background: ${(p) => (p.$active ? 'rgba(0, 0, 0, 0.05)' : editorTheme.accentMuted)};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(233, 181, 11, 0.45);
  }
`

const Chevron = styled.span<{ $expanded: boolean }>`
  flex-shrink: 0;
  width: 14px;
  font-size: 0.72rem;
  color: ${palette.textMuted};
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0')});
  transition: transform 0.18s ease;
  border: none;
  background: none;
  line-height: 1;
`

const NovelActions = styled.div`
  flex-shrink: 0;
  margin-left: auto;
`

const SessionNest = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 0.25rem 0 0.2rem 0.35rem;
`

const NestSearch = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 0.4rem;
`

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.55rem;
  background: ${editorTheme.bgElevated};
  border: 1px solid ${editorTheme.border};
  border-radius: 8px;
  svg {
    width: 13px;
    height: 13px;
    color: ${editorTheme.textMuted};
    flex-shrink: 0;
  }
  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 0.78rem;
    color: ${editorTheme.text};
    outline: none;
    &::placeholder {
      color: ${editorTheme.textMuted};
    }
  }
`

const EmptyHint = styled.div`
  font-size: 0.76rem;
  color: ${palette.textFaint};
  padding: 0.35rem 0.1rem;
  line-height: 1.45;
`

const SessionIcon = styled.div`
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    width: 14px;
    height: 14px;
    color: ${palette.textMuted};
  }
`

const SessionInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const SessionTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${editorTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SessionTime = styled.div`
  font-size: 0.65rem;
  color: ${palette.textMuted};
  margin-top: 2px;
`

const SidebarFooter = styled.div`
  padding: 0.65rem;
  border-top: 1px solid ${editorTheme.border};
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
`
