import type { AgentEventEnvelope } from '../types/agent'
import type { CrewFailureReportPayload, CrewFailureIssue, CrewStageUiState, CrewStageUiStep } from '../types/crew'
import { resolveProfileLabel } from './profileLabels'

export function createInitialCrewStageState(): CrewStageUiState {
  return { steps: [] }
}

function stageLabel(key: string, profileId?: string): string {
  if (profileId) {
    return resolveProfileLabel(profileId)
  }
  return key
}

function upsertStep(
  steps: CrewStageUiStep[],
  key: string,
  patch: Partial<CrewStageUiStep>,
): CrewStageUiStep[] {
  const idx = steps.findIndex((s) => s.key === key)
  if (idx < 0) {
    return [
      ...steps,
      {
        key,
        label: patch.label ?? key,
        status: patch.status ?? 'pending',
        profileId: patch.profileId,
        summary: patch.summary,
      },
    ]
  }
  const next = [...steps]
  next[idx] = { ...next[idx], ...patch }
  return next
}

export function parseCrewFailurePayload(
  payload: Record<string, unknown>,
): CrewFailureReportPayload | undefined {
  const verdictRaw = payload.verdict ?? payload.status
  const verdict =
    verdictRaw === 'PASS' || verdictRaw === 'WARN' || verdictRaw === 'FAIL'
      ? verdictRaw
      : undefined
  const reportMarkdown =
    typeof payload.report === 'string'
      ? payload.report
      : typeof payload.report_markdown === 'string'
        ? payload.report_markdown
        : typeof payload.reportMarkdown === 'string'
          ? payload.reportMarkdown
          : undefined
  const issuesRaw = payload.issues
  const issues = Array.isArray(issuesRaw)
    ? issuesRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const severity = row.severity
          if (severity !== 'PASS' && severity !== 'WARN' && severity !== 'FAIL') return null
          const message = typeof row.message === 'string' ? row.message : ''
          if (!message) return null
          return {
            severity: severity as CrewFailureIssue['severity'],
            message,
            detail: typeof row.detail === 'string' ? row.detail : undefined,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : undefined
  const reviewerChildRunId =
    typeof payload.reviewer_child_run_id === 'string'
      ? payload.reviewer_child_run_id
      : typeof payload.reviewerChildRunId === 'string'
        ? payload.reviewerChildRunId
        : typeof payload.child_run_id === 'string'
          ? payload.child_run_id
          : undefined
  const reviewerStageKey =
    typeof payload.reviewer_stage_key === 'string'
      ? payload.reviewer_stage_key
      : typeof payload.reviewerStageKey === 'string'
        ? payload.reviewerStageKey
        : typeof payload.stage_key === 'string'
          ? payload.stage_key
          : undefined
  if (!verdict && !reportMarkdown && (!issues || issues.length === 0)) {
    return undefined
  }
  return {
    verdict: verdict ?? 'FAIL',
    reportMarkdown,
    issues,
    reviewerChildRunId,
    reviewerStageKey,
  }
}

export function applyCrewEvent(
  state: CrewStageUiState,
  event: AgentEventEnvelope,
): { state: CrewStageUiState; failure?: CrewFailureReportPayload } {
  const type = event.type
  const payload =
    event.payload && typeof event.payload === 'object'
      ? (event.payload as Record<string, unknown>)
      : {}

  if (type === 'crew.started') {
    const crewId =
      typeof payload.crew_id === 'string'
        ? payload.crew_id
        : typeof payload.crewId === 'string'
          ? payload.crewId
          : undefined
    const displayName =
      typeof payload.display_name === 'string'
        ? payload.display_name
        : typeof payload.displayName === 'string'
          ? payload.displayName
          : undefined
    const stageCount =
      typeof payload.stage_count === 'number'
        ? payload.stage_count
        : typeof payload.stageCount === 'number'
          ? payload.stageCount
          : 0
    const steps: CrewStageUiStep[] = Array.from({ length: stageCount }, (_, i) => ({
      key: `stage-${i}`,
      label: `${i + 1}`,
      status: 'pending',
    }))
    return { state: { crewId, displayName, steps, failed: false } }
  }

  if (type === 'crew.stage.started') {
    const stageKey =
      typeof payload.stage_key === 'string'
        ? payload.stage_key
        : typeof payload.stageKey === 'string'
          ? payload.stageKey
          : ''
    const profileId =
      typeof payload.profile_id === 'string'
        ? payload.profile_id
        : typeof payload.profileId === 'string'
          ? payload.profileId
          : undefined
    let steps = state.steps.map((s) =>
      s.status === 'active' ? { ...s, status: 'done' as const } : s,
    )
    steps = upsertStep(steps, stageKey, {
      profileId,
      label: stageLabel(stageKey, profileId),
      status: 'active',
    })
    return { state: { ...state, steps, failed: false } }
  }

  if (type === 'crew.stage.completed') {
    const stageKey =
      typeof payload.stage_key === 'string'
        ? payload.stage_key
        : typeof payload.stageKey === 'string'
          ? payload.stageKey
          : ''
    const statusRaw = payload.status
    const failed = statusRaw === 'failed' || statusRaw === 'error'
    const summary =
      typeof payload.summary === 'string'
        ? payload.summary
        : typeof payload.output_summary === 'string'
          ? payload.output_summary
          : undefined
    const steps = upsertStep(state.steps, stageKey, {
      status: failed ? 'failed' : 'done',
      summary,
    })
    return { state: { ...state, steps, failed: state.failed || failed } }
  }

  if (type === 'crew.completed') {
    const steps = state.steps.map((s) =>
      s.status === 'active' ? { ...s, status: 'done' as const } : s,
    )
    return { state: { ...state, steps, failed: false } }
  }

  if (type === 'crew.failed') {
    const steps = state.steps.map((s) =>
      s.status === 'active' || s.status === 'pending'
        ? { ...s, status: 'failed' as const }
        : s,
    )
    const failure = parseCrewFailurePayload(payload)
    return { state: { ...state, steps, failed: true }, failure }
  }

  return { state }
}
