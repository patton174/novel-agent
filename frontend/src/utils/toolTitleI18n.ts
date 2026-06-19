import i18n from '@/i18n'
import { translateToolDisplayName } from './orchestrationI18n'

/**
 * Lifecycle phase a tool row is rendered in. Drives a phase-specific title
 * (e.g. "正在写入章节…" vs "已写入章节") instead of a generic name + chip.
 */
export type ToolTitlePhase =
  | 'started'
  | 'running'
  | 'runningStream'
  | 'awaiting'
  | 'done'
  | 'failed'

/** Map the timeline's Chinese phase label + active flag onto a stable phase enum. */
export function inferToolTitlePhase(
  phase: string | undefined,
  options: { active?: boolean; streaming?: boolean } = {},
): ToolTitlePhase {
  const raw = (phase ?? '').trim()
  if (raw === '失败') {
    return 'failed'
  }
  if (raw === '已完成') {
    return 'done'
  }
  if (raw === '等待回答') {
    return 'awaiting'
  }
  if (options.streaming && (options.active || raw === '运行中' || raw === '进行中')) {
    return 'runningStream'
  }
  if (options.active || raw === '运行中' || raw === '进行中') {
    return 'running'
  }
  return 'started'
}

export interface ResolvedToolTitle {
  /** The label to display. Always set (falls back to the localized tool name). */
  title: string
  /**
   * Whether a phase-specific title was found. When true the caller should drop
   * the separate phase chip (the phase is already encoded in the title).
   */
  hasPhaseTitle: boolean
}

// runningStream falls back to running when a tool has no dedicated streaming title.
const PHASE_FALLBACK: Record<ToolTitlePhase, ToolTitlePhase[]> = {
  started: ['started'],
  running: ['running'],
  runningStream: ['runningStream', 'running'],
  awaiting: ['awaiting', 'running'],
  done: ['done'],
  failed: ['failed'],
}

function lookupPhaseTitle(tool: string, phase: ToolTitlePhase): string | undefined {
  for (const candidate of PHASE_FALLBACK[phase]) {
    const value = i18n.t(`editor:timeline.toolTitles.${tool}.${candidate}`, {
      defaultValue: '',
    })
    if (value) {
      return value
    }
  }
  return undefined
}

/**
 * Resolve a phase-aware, localized title for a tool row. Returns the
 * tool's display name unchanged when no phase-specific title is defined,
 * so untranslated tools keep the legacy "name · phase" presentation.
 */
export function resolveToolTitle(
  tool: string | undefined,
  phase: ToolTitlePhase,
): ResolvedToolTitle {
  // Key off the RAW tool API name (e.g. WriteChapter vs WriteMemory). Do NOT
  // normalize — normalizeToolName collapses both onto a generic "Write" icon,
  // which would lose the per-domain title distinction.
  const raw = (tool ?? '').trim()
  if (raw) {
    const phaseTitle = lookupPhaseTitle(raw, phase)
    if (phaseTitle) {
      return { title: phaseTitle, hasPhaseTitle: true }
    }
  }
  return { title: translateToolDisplayName(raw), hasPhaseTitle: false }
}
