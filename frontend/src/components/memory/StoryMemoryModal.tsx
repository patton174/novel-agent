import { useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { AgentMarkdown } from '../agent/AgentMarkdown'
import { EditorButton } from '../ui/EditorButton'
import { MotionSegmentRail } from '../motion/MotionSegmentRail'
import { MotionPane } from '../motion/MotionPane'
import { editorModalSurface } from '../../styles/editorModal'
import { palette } from '../../styles/theme'
import type {
  MemoryTabId,
  NormalizedStoryMemory,
  StoryMemoryField,
  StoryMemoryGroup,
} from '../../types/storyMemory'
import {
  characterPreview,
  countTabEntries,
  isBodyOnlyGroup,
} from '../../utils/storyMemoryModel'

export type { MemoryTabId } from '../../types/storyMemory'

export interface StoryMemoryModalProps {
  open: boolean
  onClose: () => void
  memory: NormalizedStoryMemory
  activeTab: MemoryTabId
  onTabChange: (tab: MemoryTabId) => void
  updatedAt: Date | null
}

const TABS: { id: MemoryTabId; label: string; hint: string }[] = [
  { id: 'novel', label: '大纲', hint: '小说定位、主线与创作规划' },
  { id: 'world', label: '世界观', hint: '时代、规则、势力与设定' },
  { id: 'characters', label: '角色库', hint: '人物弧线、关系与性格' },
  { id: 'background', label: '背景', hint: '历史、地理与文化背景' },
  { id: 'chapters', label: '章节记忆', hint: '伏笔、章节约束与剧情节点' },
]

function MemoryFieldBody({ field }: { field: StoryMemoryField }) {
  if (field.format === 'plain') {
    return <PlainValue>{field.value}</PlainValue>
  }
  return <AgentMarkdown text={field.value} variant="memory" />
}

function GroupEntries({
  groups,
  emptyLabel,
  character,
}: {
  groups: StoryMemoryGroup[]
  emptyLabel: string
  character: boolean
}) {
  if (groups.length === 0) {
    return <EmptyState>{emptyLabel}</EmptyState>
  }
  return (
    <EntryList>
      {groups.map((group) => {
        const preview = character ? characterPreview(group) : null
        const bodyOnly = !character && isBodyOnlyGroup(group)
        return (
          <GroupCard key={group.id}>
            <GroupHeader>
              <GroupTitle>{group.displayTitle?.trim() || group.id}</GroupTitle>
              {preview ? (
                <GroupMeta>
                  <RoleBadge>{preview.roleLabel}</RoleBadge>
                  <GroupSummary>{preview.summary}</GroupSummary>
                </GroupMeta>
              ) : null}
            </GroupHeader>
            {bodyOnly ? (
              <EntryBody>
                <MemoryFieldBody field={group.fields[0]} />
              </EntryBody>
            ) : (
              group.fields.map((field) => (
                <EntryCard key={`${group.id}-${field.key}`} $nested>
                  <EntryKey>{field.key}</EntryKey>
                  <EntryBody>
                    <MemoryFieldBody field={field} />
                  </EntryBody>
                </EntryCard>
              ))
            )}
          </GroupCard>
        )
      })}
    </EntryList>
  )
}

export function StoryMemoryModal({
  open,
  onClose,
  memory,
  activeTab,
  onTabChange,
  updatedAt,
}: StoryMemoryModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <HeaderText>
            <Title id="memory-modal-title">记忆管理</Title>
            <Subtitle>
              只读展示{updatedAt ? ` · 更新于 ${updatedAt.toLocaleTimeString()}` : ''}
            </Subtitle>
          </HeaderText>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </DialogHeader>

        <DialogBody>
          <TabRail>
            <MotionSegmentRail
              items={TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                trailing: countTabEntries(memory, tab.id),
              }))}
              activeId={activeTab}
              onChange={onTabChange}
              aria-label="记忆分类"
            />
          </TabRail>

          <ContentPane>
            <MotionPane paneKey={activeTab}>
              <PaneHeader>
                <PaneTitle>{activeMeta.label}</PaneTitle>
                <PaneHint>{activeMeta.hint}</PaneHint>
              </PaneHeader>
              <PaneScroll>
                {activeTab === 'novel' && (
                  <GroupEntries
                    groups={memory.novel}
                    emptyLabel="暂无大纲或小说级规划"
                    character={false}
                  />
                )}
                {activeTab === 'world' && (
                  <GroupEntries
                    groups={memory.world}
                    emptyLabel="暂无世界观设定"
                    character={false}
                  />
                )}
                {activeTab === 'background' && (
                  <GroupEntries
                    groups={memory.background}
                    emptyLabel="暂无背景设定"
                    character={false}
                  />
                )}
                {activeTab === 'characters' && (
                  <GroupEntries
                    groups={memory.characters}
                    emptyLabel="暂无角色记录"
                    character
                  />
                )}
                {activeTab === 'chapters' && (
                  <GroupEntries
                    groups={memory.chapters}
                    emptyLabel="暂无章节记忆"
                    character={false}
                  />
                )}
              </PaneScroll>
            </MotionPane>
          </ContentPane>
        </DialogBody>
      </Dialog>
    </Overlay>
  )
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${editorModalSurface.overlay};
  backdrop-filter: ${editorModalSurface.overlayBlur};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  animation: ${fadeIn} 0.18s ease both;
`

const Dialog = styled.div`
  width: min(920px, 100%);
  min-width: min(680px, 100%);
  height: min(78vh, 700px);
  min-height: 520px;
  max-height: min(82vh, 760px);
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: ${editorModalSurface.dialogBg};
  box-shadow: ${editorModalSurface.dialogShadow};
  overflow: hidden;
  animation: ${slideUp} 0.22s ease both;
`

const DialogHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem 0.85rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`

const HeaderText = styled.div`
  min-width: 0;
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${palette.text};
`

const Subtitle = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: ${palette.textSubtle};
`

const DialogBody = styled.div`
  display: grid;
  grid-template-columns: 168px 1fr;
  min-height: 0;
  flex: 1;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
`

const TabRail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.22);

  @media (max-width: 720px) {
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
`

const ContentPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
`

const PaneHeader = styled.div`
  padding: 0.85rem 1rem 0.55rem;
`

const PaneTitle = styled.h3`
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: ${palette.inkHover};
`

const PaneHint = styled.p`
  margin: 0.2rem 0 0;
  font-size: 0.68rem;
  color: ${palette.textMuted};
`

const PaneScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 1rem 1rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${palette.scrollbarThumb};
    border-radius: 4px;
  }
`

const EntryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`

const EntryCard = styled.div<{ $nested?: boolean }>`
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin-left: ${({ $nested }) => ($nested ? '0.35rem' : '0')};
`

const EntryKey = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  color: ${palette.accentDark};
  margin-bottom: 0.35rem;
`

const EntryBody = styled.div`
  font-size: 0.8rem;
  color: ${palette.inkHover};
  line-height: 1.55;
`

const GroupCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.65rem 0.7rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.07);
`

const GroupHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-bottom: 0.15rem;
`

const GroupTitle = styled.div`
  font-size: 0.92rem;
  font-weight: 800;
  color: ${palette.text};
`

const GroupMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
`

const RoleBadge = styled.span`
  display: inline-flex;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  color: ${palette.memoryBrown};
  background: ${palette.accentMuted};
  border: 1px solid ${palette.accentBorderLight};
`

const GroupSummary = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.72rem;
  color: ${palette.textDim};
`

const PlainValue = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`

const EmptyState = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${palette.textFaint};
  font-size: 0.78rem;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
`
