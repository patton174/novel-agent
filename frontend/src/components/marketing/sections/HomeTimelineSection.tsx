import { useRef } from 'react'
import {
  Brain,
  GitBranch,
  PenLine,
  Search,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useHomeTimelineScroll } from '../scroll/useHomeTimelineScroll'

const TIMELINE_ITEMS: {
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
    desc: '规划过程透明可见，复杂任务自动拆解与串联。',
  },
  {
    icon: Search,
    title: '语义检索',
    desc: '基于语义召回相关章节与设定片段，不用翻找。',
  },
  {
    icon: Zap,
    title: '流式成稿',
    desc: '字句实时生成，所见即所得进入编辑器。',
  },
  {
    icon: ShieldCheck,
    title: '托管续跑',
    desc: '长任务后台执行，断线后仍可同步进度。',
  },
]

export function HomeTimelineSection() {
  const rootRef = useRef<HTMLElement>(null)
  useHomeTimelineScroll(rootRef)

  return (
    <section
      id="capabilities"
      ref={rootRef}
      className="relative w-full scroll-mt-16 overflow-hidden bg-gradient-to-b from-background via-slate-50/40 to-background px-6 py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto mb-16 max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          核心能力
        </p>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          从灵感到成稿的能力脉络
        </h2>
        <p className="text-lg text-muted-foreground">
          向下滚动，看创作流程如何一步步展开
        </p>
      </div>

      <div className="relative mx-auto max-w-4xl pb-8" data-timeline-track>
        {/* 背景主线轨道 */}
        <div
          aria-hidden
          className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border/80"
        />
        {/* 滚动填充主线 */}
        <div
          aria-hidden
          data-timeline-line
          className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 origin-top bg-gradient-to-b from-primary/50 via-primary to-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.35)]"
        />

        <div className="relative space-y-16 md:space-y-20">
          {TIMELINE_ITEMS.map((item, index) => {
            const side = index % 2 === 0 ? 'left' : 'right'
            const Icon = item.icon

            return (
              <div
                key={item.title}
                data-timeline-node
                data-side={side}
                className={`relative flex min-h-[7rem] items-center ${
                  side === 'left' ? 'justify-start md:pr-[52%]' : 'justify-end md:pl-[52%]'
                }`}
              >
                {/* 中心节点 */}
                <div
                  aria-hidden
                  data-timeline-dot
                  className="absolute left-1/2 top-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-[0_0_0_4px_rgba(79,70,229,0.12)]"
                />

                {/* 分支线 */}
                <div
                  aria-hidden
                  data-timeline-branch
                  className={`absolute top-1/2 hidden h-px w-[calc(50%-1.5rem)] bg-gradient-to-r md:block ${
                    side === 'left'
                      ? 'right-1/2 mr-3 from-primary/70 to-primary/20'
                      : 'left-1/2 ml-3 from-primary/20 to-primary/70'
                  }`}
                />

                {/* 卡片 */}
                <article
                  data-timeline-card
                  className={`group relative w-full max-w-md rounded-2xl border border-border/70 bg-white/90 p-6 shadow-soft backdrop-blur-sm transition-shadow duration-300 hover:shadow-hover md:w-[calc(50%-2.5rem)] ${
                    side === 'left' ? 'md:mr-auto' : 'md:ml-auto'
                  }`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.08]">
                      <Icon className="size-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-medium tabular-nums tracking-widest text-muted-foreground/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </article>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
