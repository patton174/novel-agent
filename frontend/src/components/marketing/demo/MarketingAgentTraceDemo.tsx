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

const STREAM_LINES = [
  '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。',
  '他深吸一口气，握紧了拳头。十年了，他终于等到了这一天。',
  '远处传来工作室杂乱的叫喊，而他只是低头看着背包里——',
  '那件从未在任何数据库中出现过的装备，在雨中泛着幽光。',
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

export function MarketingAgentTraceDemo({ variant }: { variant: MarketingAgentDemoVariant }) {
  return (
    <div className={cn(DEMO_AGENT_CONSOLE, 'demo-agent-console')} data-variant={variant}>
      <div className={DEMO_AGENT_CHROME}>
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#ff5f56]')} />
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#ffbd2e]')} />
        <span className={cn(DEMO_AGENT_CHROME_DOT, 'bg-[#27c93f]')} />
        <span className={DEMO_AGENT_CHROME_LABEL}>Agent 助手</span>
      </div>

      {variant === 'think' ? (
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
      ) : null}

      {variant === 'orchestrate' ? (
        <>
          <button type="button" className={cn(DEMO_ORCH_HEADER, 'demo-orch-header')} aria-expanded>
            <span className="chevron" />
            <span className="title">编排中 · 续写第二章</span>
          </button>
          <div className={cn(DEMO_TOOL_LIST, 'demo-tool-list')}>
            <ToolRows tools={ORCH_TOOLS} />
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
      ) : null}

      {variant === 'stream' ? (
        <div className={cn(DEMO_STREAM_BLOCK, 'demo-stream-block')}>
          <span className={DEMO_STREAM_LABEL}>chapter_create · 流式输出</span>
          {STREAM_LINES.map((line) => (
            <p key={line} className={cn(DEMO_STREAM_LINE, 'demo-stream-line')}>
              {line}
            </p>
          ))}
          <p className={cn(DEMO_STREAM_LINE, 'demo-stream-line demo-stream-tail')}>
            剑尖挑起一道寒芒，直指苍穹。
            <span className={cn(DEMO_STREAM_CURSOR, 'demo-stream-cursor')} />
          </p>
        </div>
      ) : null}
    </div>
  )
}
