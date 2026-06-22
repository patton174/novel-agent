export type AgentMarkdownVariant = 'chat' | 'memory' | 'think' | 'novel' | 'document' | 'pixel'

const VARIANT_CLASS: Record<AgentMarkdownVariant, string> = {
  chat: 'agent-prose agent-prose-chat',
  memory: 'agent-prose agent-prose-memory',
  think: 'agent-prose agent-prose-think',
  novel: 'agent-prose agent-prose-novel',
  document: 'agent-prose agent-prose-document',
  pixel: 'agent-prose agent-prose-pixel',
}

export function agentProseClass(variant: AgentMarkdownVariant, className?: string) {
  return [VARIANT_CLASS[variant], className].filter(Boolean).join(' ')
}

export const AGENT_PROSE_TABLE_SCROLL =
  'my-[0.35rem] mb-[0.55rem] w-full max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]'
