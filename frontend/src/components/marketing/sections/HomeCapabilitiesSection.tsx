import {
  Brain,
  GitBranch,
  PenLine,
  Search,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const CAPABILITIES: {
  icon: LucideIcon
  title: string
  desc: string
}[] = [
  {
    icon: PenLine,
    title: '章节续写',
    desc: '按你的指令与文风续写正文，支持目标字数与节奏控制。',
  },
  {
    icon: Brain,
    title: '世界观记忆',
    desc: '角色、势力、设定分层沉淀，长程创作不跑偏。',
  },
  {
    icon: GitBranch,
    title: '智能编排',
    desc: '思维链与规划过程透明可见，工具链自动串联。',
  },
  {
    icon: Search,
    title: '向量检索',
    desc: '基于语义召回相关章节与设定片段。',
  },
  {
    icon: Zap,
    title: '流式输出',
    desc: '字句实时生成，所见即所得进入编辑器。',
  },
  {
    icon: ShieldCheck,
    title: '托管续跑',
    desc: '长任务后台执行，断线后仍可同步进度。',
  },
]

function CapabilityCard({
  icon: Icon,
  title,
  desc,
  index,
}: (typeof CAPABILITIES)[number] & { index: number }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-white via-white to-slate-50/90 p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/[0.06] blur-3xl transition-all duration-500 group-hover:bg-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
      />

      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(79,70,229,0.08)] transition-colors duration-300 group-hover:border-primary/20 group-hover:from-primary/[0.16]">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
        <span className="text-[11px] font-medium tabular-nums tracking-widest text-muted-foreground/50">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <h3 className="relative mb-2.5 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="relative text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>

      <div
        aria-hidden
        className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </article>
  )
}

export function HomeCapabilitiesSection() {
  return (
    <section id="capabilities" className="w-full scroll-mt-16 bg-background px-6 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            核心能力
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            为长篇创作而生的能力矩阵
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            从灵感到成稿，覆盖网文作者日常所需的 AI 协作能力
          </p>
        </div>

        <div className="marketing-reveal-batch grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, index) => (
            <CapabilityCard key={cap.title} {...cap} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
