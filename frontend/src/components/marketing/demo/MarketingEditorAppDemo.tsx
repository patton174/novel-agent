export type MarketingAgentDemoVariant = 'think' | 'orchestrate' | 'subagent' | 'stream'
import {
  DemoOrchHeader,
  DemoStatusDot,
  DemoStreamBlock,
  DemoStreamCursor,
  DemoStreamLabel,
  DemoStreamLine,
  DemoSubagentWrap,
  DemoThinkBlock,
  DemoThinkCursor,
  DemoThinkHeader,
  DemoThinkLine,
  DemoToolList,
  DemoToolRow,
} from '../../../styles/surfaces/marketingAgentDemo'
import {
  AppAgentPane,
  AppAgentScroll,
  AppAgentTimeline,
  AppAgentTop,
  AppBrowserBar,
  AppChapterItem,
  AppComposerStub,
  AppEditorBody,
  AppEditorLine,
  AppEditorPane,
  AppEditorTitle,
  AppMockRoot,
  AppSidebar,
  AppSidebarNovel,
  AppUserBubble,
  AppWorkspace,
} from '../../../styles/surfaces/marketingEditorAppDemo'

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
      <DemoStatusDot $status={status} />
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
        <DemoToolRow key={tool.name} className={classPrefix}>
          <ToolIcon status={tool.status} />
          <div className="body">
            <div className="headline">
              <span className="name">{tool.name}</span>
              <span className="args">{tool.args}</span>
            </div>
            {tool.excerpt ? <div className="excerpt">{tool.excerpt}</div> : null}
          </div>
        </DemoToolRow>
      ))}
    </>
  )
}

function AgentTimeline({ variant }: { variant: MarketingAgentDemoVariant }) {
  if (variant === 'think') {
    return (
      <DemoThinkBlock className="demo-think-block" $active>
        <DemoThinkHeader className="demo-think-header" $active>
          <span className="title">思考</span>
          <span className="meta demo-think-meta">进行中</span>
        </DemoThinkHeader>
        {THINK_LINES.map((line) => (
          <DemoThinkLine key={line} className="demo-think-line">
            {line}
          </DemoThinkLine>
        ))}
        <DemoThinkLine className="demo-think-line demo-think-tail">
          准备调用 <strong>plan</strong> 生成步骤…
          <DemoThinkCursor className="demo-think-cursor" />
        </DemoThinkLine>
      </DemoThinkBlock>
    )
  }

  if (variant === 'orchestrate') {
    return (
      <>
        <DemoOrchHeader className="demo-orch-header" type="button" aria-expanded>
          <span className="chevron" />
          <span className="title">编排中 · 续写第二章</span>
        </DemoOrchHeader>
        <DemoToolList className="demo-tool-list">
          <ToolRows tools={ORCH_TOOLS} />
        </DemoToolList>
      </>
    )
  }

  if (variant === 'subagent') {
    return (
      <>
        <DemoToolRow className="demo-tool-row demo-parent-tool">
          <ToolIcon status="success" />
          <div className="body">
            <div className="headline">
              <span className="name">memory_update</span>
              <span className="args">角色一致性校验</span>
            </div>
          </div>
        </DemoToolRow>
        <DemoSubagentWrap className="demo-subagent-wrap">
          <div className="sub-head">子代理 · 角色校对</div>
          <div className="demo-subagent-inner">
            <ToolRows tools={SUBAGENT_TOOLS} classPrefix="demo-sub-tool-row" />
          </div>
        </DemoSubagentWrap>
      </>
    )
  }

  return (
    <DemoStreamBlock className="demo-stream-block">
      <DemoStreamLabel>chapter_create · 流式输出</DemoStreamLabel>
      {EDITOR_STREAM.map((line) => (
        <DemoStreamLine key={line} className="demo-stream-line">
          {line}
        </DemoStreamLine>
      ))}
      <DemoStreamLine className="demo-stream-line demo-stream-tail">
        剑尖挑起一道寒芒，直指苍穹。
        <DemoStreamCursor className="demo-stream-cursor" />
      </DemoStreamLine>
    </DemoStreamBlock>
  )
}

function EditorContent({ variant }: { variant: MarketingAgentDemoVariant }) {
  const showStream = variant === 'stream'

  return (
    <AppEditorPane data-demo-editor-pane>
      <AppEditorTitle>第二章 · 银月森林首战</AppEditorTitle>
      <AppEditorBody>
        {EDITOR_PRIOR.map((line) => (
          <AppEditorLine key={line} className="muted demo-editor-line demo-editor-prior">
            {line}
          </AppEditorLine>
        ))}
        {showStream
          ? EDITOR_STREAM.map((line) => (
              <AppEditorLine key={line} className="stream demo-editor-line demo-editor-stream">
                {line}
              </AppEditorLine>
            ))
          : null}
        {showStream ? (
          <AppEditorLine className="stream demo-editor-line demo-editor-tail">
            那件从未在任何数据库中出现过的装备，在雨中泛着幽光。
            <DemoThinkCursor className="demo-stream-cursor" />
          </AppEditorLine>
        ) : (
          <AppEditorLine className="muted demo-editor-line">
            {variant === 'orchestrate' ? '（等待 chapter_create 写入正文…）' : '（Agent 运行中…）'}
          </AppEditorLine>
        )}
      </AppEditorBody>
    </AppEditorPane>
  )
}

export interface MarketingEditorAppDemoProps {
  variant: MarketingAgentDemoVariant
}

/** 仿真实编辑器三栏 + Agent 助手，供滚动分镜 scrub 驱动 */
export function MarketingEditorAppDemo({ variant }: MarketingEditorAppDemoProps) {
  return (
    <AppMockRoot
      className="demo-app-mock demo-agent-console"
      data-variant={variant}
      aria-label="Novel AI 编辑器 Agent 演示"
    >
      <AppBrowserBar>
        <div className="traffic" aria-hidden>
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        <span className="title">Novel AI</span>
        <span className="url">localhost:3000/editor?novel=诸天神祇有价</span>
        <span className="live">Agent 运行中</span>
      </AppBrowserBar>

      <AppWorkspace>
        <AppSidebar className="demo-app-sidebar">
          <AppSidebarNovel>
            <div className="name">{NOVEL.title}</div>
            <div className="meta">{NOVEL.meta}</div>
          </AppSidebarNovel>
          {CHAPTERS.map((ch) => (
            <AppChapterItem
              key={ch.idx}
              className="demo-sidebar-chapter"
              $active={ch.active}
              data-active={ch.active ? '1' : '0'}
            >
              <span className="idx">{ch.idx}</span>
              <span>{ch.title}</span>
            </AppChapterItem>
          ))}
        </AppSidebar>

        <EditorContent variant={variant} />

        <AppAgentPane data-demo-agent-pane>
          <AppAgentTop>
            <span className="session">续写 · 第二章</span>
            <span className="model">Agent</span>
          </AppAgentTop>
          <AppAgentScroll>
            <AppUserBubble className="demo-user-msg">
              继续写第二章，衔接银月森林首战，要有掉宝爽点。
            </AppUserBubble>
            <AppAgentTimeline>
              <AgentTimeline variant={variant} />
            </AppAgentTimeline>
          </AppAgentScroll>
          <AppComposerStub>
            <div className="box">
              <span className="placeholder">描述情节或指令…</span>
              <span className="send" aria-hidden />
            </div>
          </AppComposerStub>
        </AppAgentPane>
      </AppWorkspace>
    </AppMockRoot>
  )
}
