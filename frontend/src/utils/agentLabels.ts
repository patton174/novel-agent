import i18n from '@/i18n'
import { normalizeToolName } from './agentToolNames'

function toolNameLabel(toolKey: string): string {
  return i18n.t(`editor:tools.byName.${toolKey}`, {
    defaultValue: toolKey === '_default' ? 'Tool' : toolKey,
  })
}

export function toolDisplayName(name: string): string {
  const raw = (name ?? '').trim()
  if (!raw) {
    return toolNameLabel('_default')
  }
  const canonical = normalizeToolName(raw)
  for (const candidate of [raw, canonical]) {
    const label = i18n.t(`editor:tools.byName.${candidate}`, { defaultValue: '' })
    if (label) {
      return label
    }
  }
  return raw
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isInProgressChapterTitle(cleaned: string): boolean {
  const pattern = i18n.t('editor:agent.chapterWrite.inProgressPattern', {
    defaultValue: '^(Editing|Writing)',
  })
  return new RegExp(pattern, 'i').test(cleaned)
}

export function chapterWriteProgressLabel(
  title?: string,
  toolName?: string,
): string {
  const isEdit = normalizeToolName(toolName) === 'Edit'
  const raw = (title ?? '').trim()
  const defaultChapter = i18n.t('editor:agent.stream.defaultChapter')
  const chapterNoun = i18n.t('editor:tools.byName._chapter')
  if (!raw || raw === defaultChapter || raw === chapterNoun) {
    return isEdit
      ? i18n.t('editor:agent.chapterWrite.editing')
      : i18n.t('editor:agent.chapterWrite.writing')
  }
  const writeVerb = i18n.t('editor:agent.chapterWrite.verbWrite')
  const editVerb = i18n.t('editor:agent.chapterWrite.verbEdit')
  const verbPattern = new RegExp(
    `^(Write|Edit|${escapeRegExp(writeVerb)}|${escapeRegExp(editVerb)})$`,
    'i',
  )
  const cleaned = raw.replace(verbPattern, '').trim()
  if (!cleaned) {
    return isEdit
      ? i18n.t('editor:agent.chapterWrite.editing')
      : i18n.t('editor:agent.chapterWrite.writing')
  }
  if (cleaned.startsWith('《')) {
    return isEdit
      ? i18n.t('editor:agent.chapterWrite.editingTitled', { title: cleaned })
      : i18n.t('editor:agent.chapterWrite.writingTitled', { title: cleaned.replace(/^《|》$/g, '') })
  }
  if (isInProgressChapterTitle(cleaned)) {
    return cleaned
  }
  return isEdit
    ? i18n.t('editor:agent.chapterWrite.editingTitled', { title: cleaned })
    : i18n.t('editor:agent.chapterWrite.writingTitled', { title: cleaned })
}

export function stepStatusLabel(status: 'started' | 'completed' | 'failed'): string {
  if (status === 'failed') {
    return i18n.t('editor:timeline.phaseFailed')
  }
  if (status === 'started') {
    return i18n.t('editor:timeline.phaseRunning')
  }
  return i18n.t('editor:timeline.phaseDone')
}
