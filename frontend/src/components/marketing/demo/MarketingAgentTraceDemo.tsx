import { cn } from '@/lib/utils'
import {
  DEMO_AGENT_CHROME,
  DEMO_AGENT_CHROME_DOT,
  DEMO_AGENT_CHROME_LABEL,
  DEMO_AGENT_CONSOLE,
  DEMO_ORCH_HEADER,
  DEMO_STREAM_BLOCK,
  DEMO_STREAM_CURSOR,
  DEMO_STREAM_LABEL,
  DEMO_STREAM_LINE,
  DEMO_SUBAGENT_WRAP,
  DEMO_THINK_CURSOR,
  DEMO_THINK_LINE,
  DEMO_TOOL_LIST,
  DEMO_TOOL_ROW,
  demoStatusDotClass,
  demoThinkBlockClass,
  demoThinkHeaderClass,
} from '@/lib/marketingDemoClasses'

import type { MarketingAgentDemoVariant } from './MarketingEditorAppDemo'
export type { MarketingAgentDemoVariant } from './MarketingEditorAppDemo'
import { useMarketingEditorDemoCopy, type DemoToolRow } from './useMarketingEditorDemoCopy'

function ToolIcon({ status }: { status: 'idle' | 'loading' | 'success' }) {
  return (
    <span className="lead" aria-hidden>
      <span className={demoStatusDotClass(status)} />
    </span>
  )
}

function ToolRows({
  tools,
  classPrefix = 'demo-tool-row',
}: {
  tools: DemoToolRow[]
  classPrefix?: string
}) {
  return (
    <>
      {tools.map((tool) => (
        <div key={`${tool.name}-${tool.args}`} className={cn(DEMO_TOOL_ROW, classPrefix)}>
          <ToolIcon status={tool.status} />
          <div className="body">
            <div className="headline">
              <span className="name">{tool.name}</span>
              <span className="args">{tool.args}</span>
            </div>
            {tool.excerpt ? <div className="excerpt">{tool.excerpt}</div> : null}
          </div>
        </div>
      ))}
    </>
  )
}

export function MarketingAgentTraceDemo({ variant }: { variant: MarketingAgentDemoVariant }) {
  const copy = useMarketingEditorDemoCopy()
  const { labels, thinkLines, orchTools, subagentTools, editorStream, streamTail, planTool } = copy

  return (
    <div className={cn(DEMO_AGENT_CONSOLE, 'demo-agent-console')} data-variant={variant}>
      <div className={DEMO_AGENT_CHROME}>
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#ff5f56]')} />
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#ffbd2e]')} />
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#27c93f]')} />
        <span className={DEMO_AGENT_CHROME_LABEL}>{labels.agentChrome}</span>
      </div>

      {variant === 'think' ? (
        <div className={cn(demoThinkBlockClass(true), 'demo-think-block')}>
          <div className={cn(demoThinkHeaderClass(true), 'demo-think-header')}>
            <span className="title">{labels.thinking}</span>
            <span className="meta demo-think-meta">{labels.inProgress}</span>
          </div>
          {thinkLines.map((line) => (
            <p key={line} className={cn(DEMO_THINK_LINE, 'demo-think-line')}>
              {line}
            </p>
          ))}
          <p className={cn(DEMO_THINK_LINE, 'demo-think-line demo-think-tail')}>
            {labels.planPrepareBefore}
            <strong>{planTool}</strong>
            {labels.planPrepareAfter}
            <span className={cn(DEMO_THINK_CURSOR, 'demo-think-cursor')} />
          </p>
        </div>
      ) : null}

      {variant === 'orchestrate' ? (
        <>
          <button type="button" className={cn(DEMO_ORCH_HEADER, 'demo-orch-header')} aria-expanded>
            <span className="chevron" />
            <span className="title">{labels.orchTitle}</span>
          </button>
          <div className={cn(DEMO_TOOL_LIST, 'demo-tool-list')}>
            <ToolRows tools={orchTools} />
          </div>
        </>
      ) : null}

      {variant === 'subagent' ? (
        <>
          <div className={cn(DEMO_TOOL_ROW, 'demo-tool-row demo-parent-tool')}>
            <ToolIcon status="success" />
            <div className="body">
              <div className="headline">
                <span className="name">memory_update</span>
                <span className="args">{labels.memoryUpdateArgs}</span>
              </div>
            </div>
          </div>
          <div className={cn(DEMO_SUBAGENT_WRAP, 'demo-subagent-wrap')}>
            <div className="sub-head">{labels.subagentHead}</div>
            <div className="demo-subagent-inner">
              <ToolRows tools={subagentTools} classPrefix="demo-sub-tool-row" />
            </div>
          </div>
        </>
      ) : null}

      {variant === 'stream' ? (
        <div className={cn(DEMO_STREAM_BLOCK, 'demo-stream-block')}>
          <span className={DEMO_STREAM_LABEL}>{labels.streamLabel}</span>
          {editorStream.map((line) => (
            <p key={line} className={cn(DEMO_STREAM_LINE, 'demo-stream-line')}>
              {line}
            </p>
          ))}
          <p className={cn(DEMO_STREAM_LINE, 'demo-stream-line')}>{copy.editorTail}</p>
          <p className={cn(DEMO_STREAM_LINE, 'demo-stream-line demo-stream-tail')}>
            {streamTail}
            <span className={cn(DEMO_STREAM_CURSOR, 'demo-stream-cursor')} />
          </p>
        </div>
      ) : null}
    </div>
  )
}
