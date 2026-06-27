export interface AgentSkillSummary {
  id: string
  name: string
  description?: string
  locale: string
  isSystem: boolean
  version: number
  tools?: string[]
  updatedAt?: string
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
