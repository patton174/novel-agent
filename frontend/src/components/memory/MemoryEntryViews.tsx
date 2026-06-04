import { AgentMarkdown } from '../agent/AgentMarkdown'
import { characterPreview } from '../../utils/storyMemoryModel'
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
  RoleBadge,
} from './storyMemoryModalStyles'

export function FlatMemoryEntries({
  fields,
  emptyLabel,
}: {
  fields: { key: string; value: string }[]
  emptyLabel: string
}) {
  if (fields.length === 0) {
    return <EmptyState>{emptyLabel}</EmptyState>
  }
  return (
    <EntryList>
      {fields.map((field) => (
        <EntryCard key={field.key}>
          <EntryKey>{field.key}</EntryKey>
          <EntryBody>
            <AgentMarkdown text={field.value} variant="memory" />
          </EntryBody>
        </EntryCard>
      ))}
    </EntryList>
  )
}

export function GroupMemoryEntries({
  groups,
  emptyLabel,
  character,
}: {
  groups: { id: string; fields: { key: string; value: string }[] }[]
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
        return (
          <GroupCard key={group.id}>
            <GroupHeader>
              <GroupTitle>{group.id}</GroupTitle>
              {preview ? (
                <GroupMeta>
                  <RoleBadge>{preview.roleLabel}</RoleBadge>
                  <GroupSummary>{preview.summary}</GroupSummary>
                </GroupMeta>
              ) : null}
            </GroupHeader>
            {group.fields.map((field) => (
              <EntryCard key={`${group.id}-${field.key}`} $nested>
                <EntryKey>{field.key}</EntryKey>
                <EntryBody>
                  <AgentMarkdown text={field.value} variant="memory" />
                </EntryBody>
              </EntryCard>
            ))}
          </GroupCard>
        )
      })}
    </EntryList>
  )
}
