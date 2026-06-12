import { AgentMarkdown } from '../agent/AgentMarkdown'
import { characterPreview } from '../../utils/storyMemoryModel'
import {
  MEMORY_EMPTY_STATE,
  MEMORY_ENTRY_BODY,
  MEMORY_ENTRY_KEY,
  MEMORY_ENTRY_LIST,
  MEMORY_GROUP_CARD,
  MEMORY_GROUP_HEADER,
  MEMORY_GROUP_META,
  MEMORY_GROUP_SUMMARY,
  MEMORY_GROUP_TITLE,
  MEMORY_ROLE_BADGE,
  memoryEntryCardClass,
} from '@/lib/storyMemoryModalClasses'

export function FlatMemoryEntries({
  fields,
  emptyLabel,
}: {
  fields: { key: string; value: string }[]
  emptyLabel: string
}) {
  if (fields.length === 0) {
    return <div className={MEMORY_EMPTY_STATE}>{emptyLabel}</div>
  }
  return (
    <div className={MEMORY_ENTRY_LIST}>
      {fields.map((field) => (
        <div key={field.key} className={memoryEntryCardClass()}>
          <div className={MEMORY_ENTRY_KEY}>{field.key}</div>
          <div className={MEMORY_ENTRY_BODY}>
            <AgentMarkdown text={field.value} variant="memory" />
          </div>
        </div>
      ))}
    </div>
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
    return <div className={MEMORY_EMPTY_STATE}>{emptyLabel}</div>
  }
  return (
    <div className={MEMORY_ENTRY_LIST}>
      {groups.map((group) => {
        const preview = character ? characterPreview(group) : null
        return (
          <div key={group.id} className={MEMORY_GROUP_CARD}>
            <div className={MEMORY_GROUP_HEADER}>
              <div className={MEMORY_GROUP_TITLE}>{group.id}</div>
              {preview ? (
                <div className={MEMORY_GROUP_META}>
                  <span className={MEMORY_ROLE_BADGE}>{preview.roleLabel}</span>
                  <div className={MEMORY_GROUP_SUMMARY}>{preview.summary}</div>
                </div>
              ) : null}
            </div>
            {group.fields.map((field) => (
              <div key={`${group.id}-${field.key}`} className={memoryEntryCardClass(true)}>
                <div className={MEMORY_ENTRY_KEY}>{field.key}</div>
                <div className={MEMORY_ENTRY_BODY}>
                  <AgentMarkdown text={field.value} variant="memory" />
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
