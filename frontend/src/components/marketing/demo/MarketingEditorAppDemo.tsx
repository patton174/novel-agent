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

export type MarketingAgentDemoVariant = 'think' | 'orchestrate' | 'subagent' | 'stream'

const NOVEL = { title: '诸天神祇有价', meta: '玄幻 · 连载中' }

const CHAPTERS = [
  { idx: '01', title: '天赋觉醒', active: false },
  { idx: '02', title: '银月森林首战', active: true },
  { idx: '03', title: '全服唯一', active: false },
]

const EDITOR_PRIOR = [
  '唐云站在银月森林入口，背包里只有一把生锈的铁剑。',
  '「继续第二章」——他盯着 Agent 面板，等待下一段爽点落下。',
]

const EDITOR_STREAM = [
  '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。',
  '他深吸一口气，握紧了拳头。十年了，他终于等到了这一天。',
  '远处传来工作室杂乱的叫喊，而他只是低头看着背包里——',
]

const THINK_LINES = [
  '用户说「继续第二章」，前文停在天赋觉醒段，需衔接银月森林首战。',
  '建议节奏：先 5 只小怪验证 100% 掉宝，再触发「全服唯一」强化石爽点。',
  '风险：避免一次给太多神话装备，用「量」的堆积建立认知差。',
]

const ORCH_TOOLS = [
  { name: 'think', args: '续写切入点分析', status: 'success' as const, excerpt: '' },
  { name: 'memory_read', args: '角色库 · 世界观', status: 'success' as const, excerpt: '命中 Tang_Yun、势力格局' },
  { name: 'plan', args: '第二章结构', status: 'success' as const, excerpt: '首战 → 掉宝 → 钩子' },
  { name: 'chapter_create', args: 'task: 天赋初验', status: 'loading' as const, excerpt: '' },
]

const SUBAGENT_TOOLS = [
  { name: 'memory_read', args: '角色卡 Tang_Yun', status: 'success' as const, excerpt: '人设无冲突' },
  { name: 'output', args: '校对摘要', status: 'success' as const, excerpt: '已同步至记忆' },
]

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
  tools: typeof ORCH_TOOLS
  classPrefix?: string
}) {
  return (
    <>
      {tools.map((tool) => (
        <div key={tool.name} className={cn(DEMO_TOOL_ROW, classPrefix)}>
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

function AgentTimeline({ variant }: { variant: MarketingAgentDemoVariant }) {
  if (variant === 'think') {
    return (
      <div className={cn(demoThinkBlockClass(true), 'demo-think-block')}>
        <div className={cn(demoThinkHeaderClass(true), 'demo-think-header')}>
          <span className="title">思考</span>
          <span className="meta demo-think-meta">进行中</span>
        </div>
        {THINK_LINES.map((line) => (
          <p key={line} className={cn(DEMO_THINK_LINE, 'demo-think-line')}>
            {line}
          </p>
        ))}
        <p className={cn(DEMO_THINK_LINE, 'demo-think-line demo-think-tail')}>
          准备调用 <strong>plan</strong> 生成步骤…
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
          <span className="title">编排中 · 续写第二章</span>
        </button>
        <div className={cn(DEMO_TOOL_LIST, 'demo-tool-list')}>
          <ToolRows tools={ORCH_TOOLS} />
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
              <span className="args">角色一致性校验</span>
            </div>
          </div>
        </div>
        <div className={cn(DEMO_SUBAGENT_WRAP, 'demo-subagent-wrap')}>
          <div className="sub-head">子代理 · 角色校对</div>
          <div className="demo-subagent-inner">
            <ToolRows tools={SUBAGENT_TOOLS} classPrefix="demo-sub-tool-row" />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={cn(DEMO_STREAM_BLOCK, 'demo-stream-block')}>
      <span className={DEMO_STREAM_LABEL}>chapter_create · 流式输出</span>
      {EDITOR_STREAM.map((line) => (
        <p key={line} className={cn(DEMO_STREAM_LINE, 'demo-stream-line')}>
          {line}
        </p>
      ))}
      <p className={cn(DEMO_STREAM_LINE, 'demo-stream-line demo-stream-tail')}>
        剑尖挑起一道寒芒，直指苍穹。
        <span className={cn(DEMO_STREAM_CURSOR, 'demo-stream-cursor')} />
      </p>
    </div>
  )
}

function EditorContent({ variant }: { variant: MarketingAgentDemoVariant }) {
  const showStream = variant === 'stream'

  return (
    <main className={DEMO_APP_EDITOR_PANE} data-demo-editor-pane>
      <h3 className={DEMO_APP_EDITOR_TITLE}>第二章 · 银月森林首战</h3>
      <div className={DEMO_APP_EDITOR_BODY}>
        {EDITOR_PRIOR.map((line) => (
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
          ? EDITOR_STREAM.map((line) => (
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
            那件从未在任何数据库中出现过的装备，在雨中泛着幽光。
            <span className={cn(DEMO_THINK_CURSOR, 'demo-stream-cursor')} />
          </p>
        ) : (
          <p className={cn(DEMO_APP_EDITOR_LINE, DEMO_APP_EDITOR_LINE_MUTED, 'demo-editor-line')}>
            {variant === 'orchestrate' ? '（等待 chapter_create 写入正文…）' : '（Agent 运行中…）'}
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
  return (
    <div
      className={cn(DEMO_APP_MOCK_ROOT, 'demo-app-mock demo-agent-console')}
      data-variant={variant}
      aria-label={`${BRAND_NAME} 编辑器 Agent 演示`}
    >
      <div className={DEMO_APP_BROWSER_BAR}>
        <div className={DEMO_BROWSER_TRAFFIC} aria-hidden>
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_RED)} />
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_YELLOW)} />
          <span className={cn(DEMO_BROWSER_DOT, DEMO_BROWSER_DOT_GREEN)} />
        </div>
        <span className={DEMO_BROWSER_TITLE}>{BRAND_NAME}</span>
        <span className={DEMO_BROWSER_URL}>localhost:3000/editor?novel=诸天神祇有价</span>
        <span className={DEMO_BROWSER_LIVE}>Agent 运行中</span>
      </div>

      <div className={DEMO_APP_WORKSPACE}>
        <aside className={cn(DEMO_APP_SIDEBAR, 'demo-app-sidebar')}>
          <div className={DEMO_APP_SIDEBAR_NOVEL}>
            <div className={DEMO_APP_SIDEBAR_NOVEL_NAME}>{NOVEL.title}</div>
            <div className={DEMO_APP_SIDEBAR_NOVEL_META}>{NOVEL.meta}</div>
          </div>
          {CHAPTERS.map((ch) => (
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

        <EditorContent variant={variant} />

        <aside className={DEMO_APP_AGENT_PANE} data-demo-agent-pane>
          <div className={DEMO_APP_AGENT_TOP}>
            <span className={DEMO_APP_AGENT_SESSION}>续写 · 第二章</span>
            <span className={DEMO_APP_AGENT_MODEL}>Agent</span>
          </div>
          <div className={DEMO_APP_AGENT_SCROLL}>
            <div className={cn(DEMO_APP_USER_BUBBLE, 'demo-user-msg')}>
              继续写第二章，衔接银月森林首战，要有掉宝爽点。
            </div>
            <div className={DEMO_APP_AGENT_TIMELINE}>
              <AgentTimeline variant={variant} />
            </div>
          </div>
          <div className={DEMO_APP_COMPOSER_STUB}>
            <div className={DEMO_APP_COMPOSER_BOX}>
              <span className={DEMO_APP_COMPOSER_PLACEHOLDER}>描述情节或指令…</span>
              <span className={DEMO_APP_COMPOSER_SEND} aria-hidden />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
