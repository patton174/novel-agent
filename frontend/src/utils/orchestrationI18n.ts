import i18n from '@/i18n'

const HEADLINE_KEYS: Record<string, string> = {
  '编排': 'editor:timeline.orchestration',
  '编排中…': 'editor:timeline.orchestrationActive',
  '编排完成': 'editor:timeline.orchestrationDone',
  '成稿中…': 'editor:timeline.drafting',
  '思考中…': 'editor:timeline.thinkingActive',
  '思考': 'editor:timeline.thinking',
}

const PHASE_KEYS: Record<string, string> = {
  '进行中': 'editor:timeline.phaseRunning',
  '已完成': 'editor:timeline.phaseDone',
  '运行中': 'editor:timeline.phaseRunning',
  '失败': 'editor:timeline.phaseFailed',
  '等待回答': 'editor:timeline.phaseAwaiting',
}

export function translateOrchestrationHeadline(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const key = HEADLINE_KEYS[trimmed]
  if (key) return i18n.t(key)
  return trimmed
}

export function translateToolPhase(raw: string | undefined): string | undefined {
  if (!raw) return raw
  const key = PHASE_KEYS[raw]
  return key ? i18n.t(key) : raw
}

export function translateToolDisplayName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const fromHeadline = HEADLINE_KEYS[trimmed]
  if (fromHeadline) return i18n.t(fromHeadline)
  const direct = i18n.t(`editor:tools.${trimmed}`, { defaultValue: '' })
  if (direct) return direct
  return trimmed
}
