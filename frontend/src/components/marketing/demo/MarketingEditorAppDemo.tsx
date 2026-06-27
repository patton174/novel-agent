import { cn } from '@/lib/utils'
import {
  DEMO_APP_AGENT_MODEL,
  DEMO_APP_AGENT_PANE,
  DEMO_APP_AGENT_SCROLL,
  DEMO_APP_AGENT_SESSION,
  DEMO_APP_AGENT_TIMELINE,
  DEMO_APP_AGENT_TOP,
  DEMO_APP_BROWSER_BAR,
  DEMO_APP_COMPOSER_BOX,
  DEMO_APP_COMPOSER_PLACEHOLDER,
  DEMO_APP_COMPOSER_SEND,
  DEMO_APP_COMPOSER_STUB,
  DEMO_APP_EDITOR_BODY,
  DEMO_APP_EDITOR_LINE,
  DEMO_APP_EDITOR_LINE_MUTED,
  DEMO_APP_EDITOR_LINE_STREAM,
  DEMO_APP_EDITOR_PANE,
  DEMO_APP_EDITOR_TITLE,
  DEMO_APP_MOCK_ROOT,
  DEMO_APP_SIDEBAR,
  DEMO_APP_SIDEBAR_NOVEL,
  DEMO_APP_SIDEBAR_NOVEL_META,
  DEMO_APP_SIDEBAR_NOVEL_NAME,
  DEMO_APP_USER_BUBBLE,
  DEMO_APP_WORKSPACE,
  DEMO_BROWSER_DOT,
  DEMO_BROWSER_DOT_GREEN,
  DEMO_BROWSER_DOT_RED,
  DEMO_BROWSER_DOT_YELLOW,
  DEMO_BROWSER_LIVE,
  DEMO_BROWSER_TITLE,
  DEMO_BROWSER_TRAFFIC,
  DEMO_BROWSER_URL,
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
  demoChapterItemClass,
  demoStatusDotClass,
  demoThinkBlockClass,
  demoThinkHeaderClass,
} from '@/lib/marketingDemoClasses'

import { BRAND_NAME } from '@/lib/brand'
import { useMarketingEditorDemoCopy, type DemoToolRow } from './useMarketingEditorDemoCopy'

export type MarketingAgentDemoVariant = 'think' | 'orchestrate' | 'subagent' | 'stream'

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

function AgentTimeline({
  variant,
  copy,
}: {
  variant: MarketingAgentDemoVariant
  copy: ReturnType<typeof useMarketingEditorDemoCopy>
}) {
  const { labels, thinkLines, orchTools, subagentTools, editorStream, streamTail, planTool } = copy

  if (variant === 'think') {
    return (
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
    )
  }

  if (variant === 'orchestrate') {
    return (
      <>
        <button type="button" className={cn(DEMO_ORCH_HEADER, 'demo-orch-header')} aria-expanded>
          <span className="chevron" />
          <span className="title">{labels.orchTitle}</span>
        </button>
        <div className={cn(DEMO_TOOL_LIST, 'demo-tool-list')}>
          <ToolRows tools={orchTools} />
        </div>
      </>
    )
  }

  if (variant === 'subagent') {
    return (
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
    )
  }

  return (
    <div className={cn(DEMO_STREAM_BLOCK, 'demo-stream-block')}>
      <span className={DEMO_STREAM_LABEL}>{labels.streamLabel}</span>
      {editorStream.map((line) => (
        <p key={line} className={cn(DEMO_STREAM_LINE, 'demo-stream-line')}>
          {line}
        </p>
      ))}
      <p className={cn(DEMO_STREAM_LINE, 'demo-stream-line demo-stream-tail')}>
        {streamTail}
        <span className={cn(DEMO_STREAM_CURSOR, 'demo-stream-cursor')} />
      </p>
    </div>
  )
}

function EditorContent({
  variant,
  copy,
}: {
  variant: MarketingAgentDemoVariant
  copy: ReturnType<typeof useMarketingEditorDemoCopy>
}) {
  const showStream = variant === 'stream'
  const { labels, editorPrior, editorStream, editorTail, waitingVariants } = copy

  return (
    <main className={DEMO_APP_EDITOR_PANE} data-demo-editor-pane>
      <h3 className={DEMO_APP_EDITOR_TITLE}>{labels.editorTitle}</h3>
      <div className={DEMO_APP_EDITOR_BODY}>
        {editorPrior.map((line) => (
          <p
            key={line}
            className={cn(
              DEMO_APP_EDITOR_LINE,
              DEMO_APP_EDITOR_LINE_MUTED,
              'demo-editor-line demo-editor-prior',
            )}
          >
            {line}
          </p>
        ))}
        {showStream
          ? editorStream.map((line) => (
              <p
                key={line}
                className={cn(
                  DEMO_APP_EDITOR_LINE,
                  DEMO_APP_EDITOR_LINE_STREAM,
                  'demo-editor-line demo-editor-stream',
                )}
              >
                {line}
              </p>
            ))
          : null}
        {showStream ? (
          <p
            className={cn(
              DEMO_APP_EDITOR_LINE,
              DEMO_APP_EDITOR_LINE_STREAM,
              'demo-editor-line demo-editor-tail',
            )}
          >
            {editorTail}
            <span className={cn(DEMO_THINK_CURSOR, 'demo-stream-cursor')} />
          </p>
        ) : (
          <p className={cn(DEMO_APP_EDITOR_LINE, DEMO_APP_EDITOR_LINE_MUTED, 'demo-editor-line')}>
            {variant === 'orchestrate' ? waitingVariants.orchestrate : waitingVariants.default}
          </p>
        )}
      </div>
    </main>
  )
}

export interface MarketingEditorAppDemoProps {
  variant: MarketingAgentDemoVariant
}

/** 仿真实编辑器三栏 + Agent 助手，供滚动分镜 scrub 驱动 */
export function MarketingEditorAppDemo({ variant }: MarketingEditorAppDemoProps) {
  const copy = useMarketingEditorDemoCopy()

  return (
    <div
      className={cn(DEMO_APP_MOCK_ROOT, 'demo-app-mock demo-agent-console')}
      data-variant={variant}
      aria-label={copy.ariaLabel.replace('{{brand}}', BRAND_NAME)}
    >
      <div className={DEMO_APP_BROWSER_BAR}>
        <div className={DEMO_BROWSER_TRAFFIC} aria-hidden>
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_RED)} />
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_YELLOW)} />
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_GREEN)} />
        </div>
        <span className={DEMO_BROWSER_TITLE}>{BRAND_NAME}</span>
        <span className={DEMO_BROWSER_URL}>{copy.browserUrl}</span>
        <span className={DEMO_BROWSER_LIVE}>{copy.labels.browserLive}</span>
      </div>

      <div className={DEMO_APP_WORKSPACE}>
        <aside className={cn(DEMO_APP_SIDEBAR, 'demo-app-sidebar')}>
          <div className={DEMO_APP_SIDEBAR_NOVEL}>
            <div className={DEMO_APP_SIDEBAR_NOVEL_NAME}>{copy.novel.title}</div>
            <div className={DEMO_APP_SIDEBAR_NOVEL_META}>{copy.novel.meta}</div>
          </div>
          {copy.chapters.map((ch) => (
            <div
              key={ch.idx}
              className={cn(demoChapterItemClass(ch.active), 'demo-sidebar-chapter')}
              data-active={ch.active ? '1' : '0'}
            >
              <span className="idx">{ch.idx}</span>
              <span>{ch.title}</span>
            </div>
          ))}
        </aside>

        <EditorContent variant={variant} copy={copy} />

        <aside className={DEMO_APP_AGENT_PANE} data-demo-agent-pane>
          <div className={DEMO_APP_AGENT_TOP}>
            <span className={DEMO_APP_AGENT_SESSION}>{copy.labels.session}</span>
            <span className={DEMO_APP_AGENT_MODEL}>Agent</span>
          </div>
          <div className={DEMO_APP_AGENT_SCROLL}>
            <div className={cn(DEMO_APP_USER_BUBBLE, 'demo-user-msg')}>{copy.userPrompt}</div>
            <div className={DEMO_APP_AGENT_TIMELINE}>
              <AgentTimeline variant={variant} copy={copy} />
            </div>
          </div>
          <div className={DEMO_APP_COMPOSER_STUB}>
            <div className={DEMO_APP_COMPOSER_BOX}>
              <span className={DEMO_APP_COMPOSER_PLACEHOLDER}>{copy.composerPlaceholder}</span>
              <span className={DEMO_APP_COMPOSER_SEND} aria-hidden />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
