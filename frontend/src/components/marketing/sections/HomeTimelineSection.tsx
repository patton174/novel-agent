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
import { useTranslation } from 'react-i18next'
import { useHomeTimelineScroll } from '../scroll/useHomeTimelineScroll'

const TIMELINE_ITEMS: {
  icon: LucideIcon
  key: string
}[] = [
  { icon: PenLine, key: 'write' },
  { icon: Brain, key: 'memory' },
  { icon: GitBranch, key: 'orchestrate' },
  { icon: Search, key: 'search' },
  { icon: Zap, key: 'stream' },
  { icon: ShieldCheck, key: 'resume' },
]

const TIMELINE_COPY: Record<string, { title: string; desc: string }> = {
  write: { title: '章节续写', desc: '按你的指令与文风续写正文，支持目标字数与节奏控制。' },
  memory: { title: '世界观记忆', desc: '角色、势力、设定分层沉淀，长程创作不跑偏。' },
  orchestrate: { title: '智能编排', desc: '规划过程透明可见，复杂任务自动拆解与串联。' },
  search: { title: '语义检索', desc: '基于语义召回相关章节与设定片段，不用翻找。' },
  stream: { title: '流式成稿', desc: '字句实时生成，所见即所得进入编辑器。' },
  resume: { title: '托管续跑', desc: '长任务后台执行，断线后仍可同步进度。' },
}

export function HomeTimelineSection() {
  const rootRef = useRef<HTMLElement>(null)
  const { t } = useTranslation('marketing')
  useHomeTimelineScroll(rootRef)

  return (
    <section
      id="capabilities"
      ref={rootRef}
      className="relative w-full scroll-mt-16 overflow-hidden bg-gradient-to-b from-background via-slate-50/50 to-background px-6 py-28"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto mb-16 max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          {t('home.timeline.eyebrow')}
        </p>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t('home.timeline.title')}
        </h2>
        <p className="text-lg text-muted-foreground">{t('home.timeline.subtitle')}</p>
      </div>

      <div className="relative mx-auto max-w-4xl pb-8" data-timeline-track>
        {/* 静态轨道 */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70"
        />
        {/* GSAP 动画主线 — 独立层，避免 transform 冲突 */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-0 -translate-x-1/2"
        >
          <div
            data-timeline-line
            className="absolute inset-y-0 left-1/2 h-full w-1 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-primary/40 via-primary to-indigo-500 shadow-[0_0_16px_rgba(79,70,229,0.4)]"
          />
        </div>

        <div className="relative space-y-16 md:space-y-24">
          {TIMELINE_ITEMS.map((item, index) => {
            const side = index % 2 === 0 ? 'left' : 'right'
            const Icon = item.icon
            const copy = TIMELINE_COPY[item.key]

            return (
              <div
                key={item.key}
                data-timeline-node
                data-side={side}
                className={`relative flex min-h-[7.5rem] items-center ${
                  side === 'left' ? 'justify-start md:pr-[52%]' : 'justify-end md:pl-[52%]'
                }`}
              >
                {/* 中心节点：外层定位，内层 GSAP 缩放 */}
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div
                    aria-hidden
                    data-timeline-dot
                    className="size-4 rounded-full border-2 border-primary bg-background shadow-[0_0_0_6px_rgba(79,70,229,0.15)]"
                  />
                </div>

                {/* 分支线：外层定位，内层 scaleX */}
                <div
                  className={`absolute top-1/2 hidden -translate-y-1/2 md:block ${
                    side === 'left'
                      ? 'right-1/2 mr-4 w-[calc(50%-1.75rem)]'
                      : 'left-1/2 ml-4 w-[calc(50%-1.75rem)]'
                  }`}
                >
                  <div
                    aria-hidden
                    data-timeline-branch
                    data-side={side}
                    className={`h-0.5 w-full origin-left bg-gradient-to-r ${
                      side === 'left'
                        ? 'from-primary to-primary/25'
                        : 'from-primary/25 to-primary'
                    }`}
                    style={{
                      transformOrigin: side === 'left' ? 'right center' : 'left center',
                    }}
                  />
                </div>

                <article
                  data-timeline-card
                  data-side={side}
                  className={`group relative w-full max-w-md rounded-2xl border border-border/70 bg-white/95 p-6 shadow-soft backdrop-blur-sm transition-shadow duration-300 hover:shadow-hover md:w-[calc(50%-2.75rem)] ${
                    side === 'left' ? 'md:mr-auto' : 'md:ml-auto'
                  }`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.08] transition-colors group-hover:bg-primary/[0.12]">
                      <Icon className="size-5 text-primary" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-medium tabular-nums tracking-widest text-muted-foreground/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                    {copy.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{copy.desc}</p>
                </article>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
