import i18n from '@/i18n'
import type { AgentStepState } from '../types/agent'
import { isHiddenUiTool } from './agentHiddenTools'

type ToolCounts = {
  readChapters: number
  readMemory: number
  writeChapters: number
  writeMemory: number
  editChapters: number
  editMemory: number
  listChapters: number
  listMemory: number
  deleteChapters: number
  deleteMemory: number
  searchKnowledge: number
  characterGraph: number
  reorderChapters: number
}

function emptyCounts(): ToolCounts {
  return {
    readChapters: 0,
    readMemory: 0,
    writeChapters: 0,
    writeMemory: 0,
    editChapters: 0,
    editMemory: 0,
    listChapters: 0,
    listMemory: 0,
    deleteChapters: 0,
    deleteMemory: 0,
    searchKnowledge: 0,
    characterGraph: 0,
    reorderChapters: 0,
  }
}

function bumpCompletedStep(counts: ToolCounts, step: AgentStepState): void {
  if (step.type !== 'tool' || step.status !== 'completed') {
    return
  }
  const tool = (step.toolName || '').trim()
  if (!tool || isHiddenUiTool(tool)) {
    return
  }
  switch (tool) {
    case 'ReadChapter':
      counts.readChapters += 1
      return
    case 'ReadMemory':
      counts.readMemory += 1
      return
    case 'WriteChapter':
      counts.writeChapters += 1
      return
    case 'CreateMemory':
      counts.writeMemory += 1
      return
    case 'EditChapter':
      counts.editChapters += 1
      return
    case 'UpdateMemoryFields':
    case 'UpdateMemoryContent':
    case 'UpdateMemoryMeta':
    case 'MoveMemory':
      counts.editMemory += 1
      return
    case 'ListChapters':
      counts.listChapters += 1
      return
    case 'ListMemory':
    case 'GetMemoryTree':
      counts.listMemory += 1
      return
    case 'DeleteChapter':
    case 'chapter_delete':
      counts.deleteChapters += 1
      return
    case 'DeleteMemory':
    case 'memory_delete':
      counts.deleteMemory += 1
      return
    case 'SearchKnowledge':
    case 'context_search':
      counts.searchKnowledge += 1
      return
    case 'GetCharacterGraph':
      counts.characterGraph += 1
      return
    case 'ReorderChapters':
      counts.reorderChapters += 1
      return
    default:
      return
  }
}

/** 主 Agent run 完成后工具统计（编排概览 / 右侧摘要） */
export function formatRunToolStats(stepStates: AgentStepState[] | undefined): string | null {
  if (!stepStates?.length) {
    return null
  }
  const counts = emptyCounts()
  for (const step of stepStates) {
    bumpCompletedStep(counts, step)
  }
  const parts: string[] = []
  const t = (key: string, params?: Record<string, unknown>) =>
    i18n.t(`editor:timeline.toolStats.${key}`, params ?? {})

  if (counts.readChapters > 0) parts.push(String(t('readChapters', { count: counts.readChapters })))
  if (counts.readMemory > 0) parts.push(String(t('readMemory', { count: counts.readMemory })))
  if (counts.writeChapters > 0) parts.push(String(t('writeChapters', { count: counts.writeChapters })))
  if (counts.writeMemory > 0) parts.push(String(t('writeMemory', { count: counts.writeMemory })))
  if (counts.editChapters > 0) parts.push(String(t('editChapters', { count: counts.editChapters })))
  if (counts.editMemory > 0) parts.push(String(t('editMemory', { count: counts.editMemory })))
  if (counts.listChapters > 0) parts.push(String(t('listChapters', { count: counts.listChapters })))
  if (counts.listMemory > 0) parts.push(String(t('listMemory', { count: counts.listMemory })))
  if (counts.deleteChapters > 0) parts.push(String(t('deleteChapters', { count: counts.deleteChapters })))
  if (counts.deleteMemory > 0) parts.push(String(t('deleteMemory', { count: counts.deleteMemory })))
  if (counts.searchKnowledge > 0) parts.push(String(t('searchKnowledge', { count: counts.searchKnowledge })))
  if (counts.reorderChapters > 0) parts.push(String(t('reorderChapters', { count: counts.reorderChapters })))

  return parts.length > 0 ? parts.join(' · ') : null
}

export function hasActiveOrchestrationSteps(stepStates: AgentStepState[]): boolean {
  return stepStates.some((step) => step.type === 'tool' && step.status === 'started')
}
