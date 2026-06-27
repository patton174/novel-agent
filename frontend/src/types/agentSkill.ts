export interface AgentSkillSummary {
  id: string
  name: string
  description?: string
  locale: string
  isSystem: boolean
  version: number
  tools?: string[]
  updatedAt?: string
  /** User's pinned version (official skills). */
  pinnedVersion?: number
  autoUpdate?: boolean
  updateAvailable?: boolean
  /** In user's library (custom or referenced official). */
  inLibrary?: boolean
  /** Enabled for Agent catalog / editor picker. */
  enabled?: boolean
}

export interface AgentSkillDetail extends AgentSkillSummary {
  content: string
}

export interface CreateAgentSkillInput {
  name: string
  description?: string
  content: string
  locale?: string
  tools?: string[]
}

export interface UpdateAgentSkillInput {
  version: number
  description?: string
  content: string
  locale?: string
  tools?: string[]
}
