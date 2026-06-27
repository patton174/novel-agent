import i18n from '@/i18n'
import { translateToolDisplayName } from './orchestrationI18n'

/**
 * Lifecycle phase a tool row is rendered in. Drives a phase-specific title
 * (e.g. running vs done copy) instead of a generic name + chip.
 */
export type ToolTitlePhase =
  | 'started'
  | 'running'
  | 'runningStream'
  | 'awaiting'
  | 'done'
  | 'failed'

const PHASE_I18N_KEYS = {
  failed: ['editor:timeline.phaseFailed', 'editor:agent.stream.timeline.phaseFailed'],
  done: ['editor:timeline.phaseDone', 'editor:agent.stream.timeline.phaseDone'],
  awaiting: ['editor:timeline.phaseAwaiting', 'editor:agent.stream.timeline.phaseAwaiting'],
  running: ['editor:timeline.phaseRunning', 'editor:agent.stream.timeline.phaseRunning'],
} as const

function matchesAnyLocale(i18nKeys: readonly string[], value: string): boolean {
  return i18nKeys.some((key) =>
    (['zh', 'en'] as const).some((lng) => i18n.t(key, { lng }) === value),
  )
}

/** Map the timeline phase label + active flag onto a stable phase enum. */
export function inferToolTitlePhase(
  phase: string | undefined,
  options: { active?: boolean; streaming?: boolean } = {},
): ToolTitlePhase {
  const raw = (phase ?? '').trim()
  if (matchesAnyLocale(PHASE_I18N_KEYS.failed, raw)) {
    return 'failed'
  }
  if (matchesAnyLocale(PHASE_I18N_KEYS.done, raw)) {
    return 'done'
  }
  if (matchesAnyLocale(PHASE_I18N_KEYS.awaiting, raw)) {
    return 'awaiting'
  }
  if (
    options.streaming &&
    (options.active || matchesAnyLocale(PHASE_I18N_KEYS.running, raw))
  ) {
    return 'runningStream'
  }
  if (options.active || matchesAnyLocale(PHASE_I18N_KEYS.running, raw)) {
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
