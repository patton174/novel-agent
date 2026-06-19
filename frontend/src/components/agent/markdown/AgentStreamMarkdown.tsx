import { useMemo } from 'react'
import { Streamdown } from 'streamdown'
import {
  agentProseClass,
  type AgentMarkdownVariant,
} from '@/lib/agentProseClasses'
import { agentMarkdownComponents } from './agentMarkdownComponents'
import { prepareAgentMarkdown } from './prepareAgentMarkdown'
import {
  agentStreamMarkdownControls,
  agentStreamMarkdownPlugins,
} from './streamMarkdownPlugins'

export interface AgentStreamMarkdownProps {
  text: string
  className?: string
  variant?: AgentMarkdownVariant
  /**
   * SSE 增量输出中：启用 streaming 模式 + remend 未闭合 Markdown。
   * 历史回放 / 静态内容请保持 false（mode=static，整块 memo）。
   */
  streaming?: boolean
  /** 流式光标与块级动画；默认跟随 streaming */
  isAnimating?: boolean
  /** 词级渐入；默认关闭以保持长文性能 */
  animated?: boolean
}

/**
 * Agent 域 Markdown 渲染器（Streamdown + agent-prose 样式）。
 * 流式容错由 Streamdown remend 处理；中文格式由 prepareAgentMarkdown 预处理。
 */
export function AgentStreamMarkdown({
  text,
  className,
  variant = 'chat',
  streaming = false,
  isAnimating,
  animated = false,
}: AgentStreamMarkdownProps) {
  const prepared = useMemo(() => prepareAgentMarkdown(text), [text])
  const animating = isAnimating ?? streaming

  if (!prepared.trim()) {
    return null
  }

  return (
    <div
      className={agentProseClass(variant, className)}
      data-variant={variant}
      data-markdown-mode={streaming ? 'streaming' : 'static'}
    >
      <Streamdown
        mode={streaming ? 'streaming' : 'static'}
        className="agent-streamdown-root min-w-0"
        parseIncompleteMarkdown={streaming}
        isAnimating={animating}
        animated={animated}
        plugins={agentStreamMarkdownPlugins}
        components={agentMarkdownComponents}
        controls={agentStreamMarkdownControls}
        lineNumbers={false}
        remend={{
          bold: true,
          italic: true,
          boldItalic: true,
          inlineCode: true,
          links: true,
          images: true,
          singleTilde: true,
        }}
      >
        {prepared}
      </Streamdown>
    </div>
  )
}
