import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeAgentMarkdown } from '../../utils/normalizeAgentMarkdown'
import {
  AGENT_PROSE_TABLE_SCROLL,
  agentProseClass,
  type AgentMarkdownVariant,
} from '@/lib/agentProseClasses'

const markdownComponents: Components = {
  table: ({ children }) => (
    <div className={AGENT_PROSE_TABLE_SCROLL}>
      <table>{children}</table>
    </div>
  ),
}

export type { AgentMarkdownVariant } from '@/lib/agentProseClasses'

export interface AgentMarkdownProps {
  text: string
  className?: string
  variant?: AgentMarkdownVariant
}

export function AgentMarkdown({ text, className, variant = 'chat' }: AgentMarkdownProps) {
  const normalized = normalizeAgentMarkdown(text)
  if (!normalized.trim()) {
    return null
  }

  return (
    <div className={agentProseClass(variant, className)} data-variant={variant}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
