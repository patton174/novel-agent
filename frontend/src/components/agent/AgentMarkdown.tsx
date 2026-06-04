import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled from 'styled-components'
import { normalizeAgentMarkdown } from '../../utils/normalizeAgentMarkdown'
import {
  chatProseCss,
  memoryProseCss,
  novelProseCss,
  thinkProseCss,
} from '../../styles/prose'

const markdownComponents: Components = {
  table: ({ children }) => (
    <TableScroll>
      <table>{children}</table>
    </TableScroll>
  ),
}

export type AgentMarkdownVariant = 'chat' | 'memory' | 'think' | 'novel'

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
    <Root $variant={variant} className={className} data-variant={variant}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </Root>
  )
}

const TableScroll = styled.div`
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  margin: 0.35rem 0 0.55rem;
  -webkit-overflow-scrolling: touch;
`

const Root = styled.div<{ $variant: AgentMarkdownVariant }>`
  ${({ $variant }) => {
    if ($variant === 'memory') return memoryProseCss
    if ($variant === 'think') return thinkProseCss
    if ($variant === 'novel') return novelProseCss
    return chatProseCss
  }}
`
