import styled from 'styled-components'
import { AgentMarkdown } from '../agent/AgentMarkdown'
import { EditorButton } from '../ui/EditorButton'
import { MotionSegmentRail } from '../motion/MotionSegmentRail'
import { MotionPane } from '../motion/MotionPane'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../editor/EditorModalShell'
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
import {
  EmptyState,
  EntryBody,
  EntryCard,
  EntryKey,
  EntryList,
  GroupCard,
  GroupHeader,
  GroupMeta,
  GroupSummary,
  GroupTitle,
  PlainValue,
  RoleBadge,
} from './storyMemoryModalStyles'

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
  useEditorModalEscape(open, onClose)

  if (!open) return null

  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <EditorModalOverlay onClick={onClose} role="presentation">
      <EditorModalPanel
        size="memory"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorModalHeader>
          <HeaderText>
            <Title id="memory-modal-title">记忆管理</Title>
            <Subtitle>
              只读展示{updatedAt ? ` · 更新于 ${updatedAt.toLocaleTimeString()}` : ''}
            </Subtitle>
          </HeaderText>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>

        <EditorModalBody className="grid min-h-0 grid-cols-1 max-[720px]:grid-rows-[auto_1fr] min-[721px]:grid-cols-[168px_1fr]">
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
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}

const HeaderText = styled.div`
  min-width: 0;
  flex: 1;
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

