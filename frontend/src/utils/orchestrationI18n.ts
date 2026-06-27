import i18n from '@/i18n'
import { toolDisplayName } from './agentLabels'

const ORCHESTRATION_HEADLINE_KEYS = [
  'editor:timeline.orchestration',
  'editor:timeline.orchestrationActive',
  'editor:timeline.orchestrationDone',
  'editor:timeline.drafting',
  'editor:timeline.thinkingActive',
  'editor:timeline.thinking',
] as const

const ORCHESTRATION_PHASE_KEYS = [
  'editor:timeline.phaseRunning',
  'editor:timeline.phaseDone',
  'editor:timeline.phaseFailed',
  'editor:timeline.phaseAwaiting',
] as const

const ORCHESTRATION_DONE_PREFIXES = [
  { key: 'editor:timeline.orchestrationDone', legacy: ['执行完成 · ', '编排完成 · '] },
] as const

function matchesAnyLocale(i18nKey: string, value: string): boolean {
  return ['zh', 'en'].some((lng) => i18n.t(i18nKey, { lng }) === value)
}

export function translateOrchestrationHeadline(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return trimmed
  }
  for (const { key, legacy } of ORCHESTRATION_DONE_PREFIXES) {
    const doneLabel = i18n.t(key)
    for (const prefix of [...legacy, `${doneLabel} · `]) {
      if (trimmed.startsWith(prefix)) {
        const overview = trimmed.slice(prefix.length).trim()
        return `${doneLabel} · ${overview}`
      }
    }
  }
  for (const key of ORCHESTRATION_HEADLINE_KEYS) {
    if (matchesAnyLocale(key, trimmed)) {
      return i18n.t(key)
    }
  }
  return trimmed
}

export function translateToolPhase(raw: string | undefined): string | undefined {
  if (!raw) {
    return raw
  }
  for (const key of ORCHESTRATION_PHASE_KEYS) {
    if (matchesAnyLocale(key, raw)) {
      return i18n.t(key)
    }
  }
  return raw
}

export function translateToolOutcome(outcome: 'success' | 'error'): string {
  return i18n.t(
    outcome === 'success'
      ? 'editor:timeline.toolStatusSuccess'
      : 'editor:timeline.toolStatusFailed',
  )
}

export function translateToolDisplayName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return trimmed
  }
  for (const key of ORCHESTRATION_HEADLINE_KEYS) {
    if (matchesAnyLocale(key, trimmed)) {
      return i18n.t(key)
    }
  }
  const fromLabels = toolDisplayName(trimmed)
  if (fromLabels !== trimmed) {
    return fromLabels
  }
  const direct = i18n.t(`editor:tools.${trimmed}`, { defaultValue: '' })
  if (direct) {
    return direct
  }
  const pathAction = i18n.t(`editor:tools.pathActions.${trimmed}`, { defaultValue: '' })
  if (pathAction) {
    return pathAction
  }
  return trimmed
}

/** Backend / persisted orchestration titles (may be legacy Chinese literals). */
export function translateOrchestrationBackendTitle(raw: string): string {
  return translateToolDisplayName(raw)
}

export function orchestrationLabelSeparator(): string {
  return i18n.t('editor:sseExcerpts.listSeparator')
}

export function formatOrchestrationParallelBatch(labels: string[]): string {
  return i18n.t('editor:agent.orchestration.parallel', {
    labels: labels.join(orchestrationLabelSeparator()),
  })
}

export function formatOrchestrationSerialBatch(labels: string[]): string {
  const arrow = i18n.t('editor:sseExcerpts.serialArrow')
  return labels.join(` ${arrow} `)
}
