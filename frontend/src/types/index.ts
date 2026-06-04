export interface User {
  id: string
  name: string
  email: string
}

export interface Project {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  title: string
  content: string
  summary?: string
  projectId: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  name: string
  description: string
  avatar?: string
  traits: string[]
  projectId: string
}

export interface WorldSetting {
  id: string
  title: string
  content: string
  category: string
  projectId: string
}

export interface AIGenerationRequest {
  type: 'continue' | 'rewrite' | 'outline' | 'dialogue' | 'proofread'
  context: {
    chapterId?: string
    characterId?: string
    prompt?: string
  }
  options?: Record<string, any>
}

export interface AIGenerationResponse {
  success: boolean
  content?: string
  error?: string
}

export type {
  AgentEventEnvelope,
  AgentStepState,
  AgentStreamRequestBody,
  AgentStreamUiState,
} from './agent'