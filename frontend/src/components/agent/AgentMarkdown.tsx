import { AgentStreamMarkdown } from './markdown'
import type { AgentMarkdownVariant } from '@/lib/agentProseClasses'

export type { AgentMarkdownVariant } from '@/lib/agentProseClasses'

export interface AgentMarkdownProps {
  text: string
  className?: string
  variant?: AgentMarkdownVariant
  /** SSE 流式输出中；启用 Streamdown streaming + remend */
  streaming?: boolean
  isAnimating?: boolean
  animated?: boolean
}

/** @see AgentStreamMarkdown */
export function AgentMarkdown({
  text,
  className,
  variant = 'chat',
  streaming = false,
  isAnimating,
  animated,
}: AgentMarkdownProps) {
  return (
    <AgentStreamMarkdown
      text={text}
      className={className}
      variant={variant}
      streaming={streaming}
      isAnimating={isAnimating}
      animated={animated}
    />
  )
}
