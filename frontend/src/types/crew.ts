export type CrewStageGate = 'always' | 'on_plan_success' | 'on_write_success'
export type CrewStageOnFail = 'abort_with_report' | 'continue'
export type CrewStageOutputSchema = 'PlanResult' | 'none' | 'custom' | string

export interface CrewStageDef {
  key: string
  profileId: string
  promptTemplate?: string
  outputSchema?: CrewStageOutputSchema
  gate?: CrewStageGate
  onFail?: CrewStageOnFail
  skillIds?: string[]
}

export interface CrewTemplateSummary {
  id: string
  displayName: string
  description?: string
  isSystem: boolean
  stageCount: number
}

export interface CrewTemplateDetail {
  id: string
  displayName: string
  description?: string
  stages: CrewStageDef[]
  isSystem: boolean
}

export interface CreateCrewTemplateInput {
  displayName: string
  description?: string
  stages: CrewStageDef[]
}

export interface UpdateCrewTemplateInput extends CreateCrewTemplateInput {}

export type CrewStageUiStatus = 'pending' | 'active' | 'done' | 'failed'

export interface CrewStageUiStep {
  key: string
  profileId?: string
  label: string
  status: CrewStageUiStatus
  summary?: string
}

export interface CrewStageUiState {
  crewId?: string
  displayName?: string
  steps: CrewStageUiStep[]
  failed?: boolean
}

export interface CrewFailureIssue {
  severity: 'PASS' | 'WARN' | 'FAIL'
  message: string
  detail?: string
}

export interface CrewFailureReportPayload {
  verdict: 'PASS' | 'WARN' | 'FAIL'
  reportMarkdown?: string
  issues?: CrewFailureIssue[]
  reviewerChildRunId?: string
  reviewerStageKey?: string
}
