export interface AgentProfileSummary {
  id: string
  displayName: string
  description?: string
  isSystem: boolean
  maxTurns?: number
  toolAllowlist?: string[]
  skillIds?: string[]
}

export interface AgentProfileDetail extends AgentProfileSummary {
  systemPromptTemplate: string
  modelOverride?: string
  maxOutputTokens?: number
}

export interface CreateAgentProfileInput {
  displayName: string
  description?: string
  systemPromptTemplate: string
  toolAllowlist?: string[]
  modelOverride?: string
  maxTurns?: number
  maxOutputTokens?: number
  skillIds?: string[]
}

export interface UpdateAgentProfileInput extends CreateAgentProfileInput {}

export interface RunTreeNode {
  runId: string
  profileId?: string
  roleLabel?: string
  status: string
  startedAt?: string
  endedAt?: string
  children: RunTreeNode[]
}
