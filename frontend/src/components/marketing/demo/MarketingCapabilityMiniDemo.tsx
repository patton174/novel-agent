import { useEffect, useState } from 'react'
import {
  DEMO_MINI_CURSOR,
  DEMO_MINI_STREAM_LINE,
  DEMO_MINI_WRAP,
  DEMO_ORCH_HEADER_STATIC,
  DEMO_STREAM_BLOCK_FLAT,
  DEMO_TOOL_LIST_COMPACT,
  DEMO_TOOL_ROW_COMPACT,
  demoOrchLineClass,
  demoStatusDotClass,
} from '@/lib/marketingDemoClasses'
import { prefersReducedMotion } from '../scroll/useMarketingGsapEffect'

const ORCH_STEPS = [
  { name: 'ReadMemory', label: '读取角色记忆' },
  { name: 'ReadChapter', label: '对齐第一章结尾' },
  { name: 'plan', label: '规划第二章结构' },
  { name: 'WriteChapter', label: '流式写入正文' },
]

const STREAM_TEXT =
  '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。他深吸一口气，握紧了拳头。'

function OrchestrationLoop() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStep(ORCH_STEPS.length - 1)
      return
    }
    const id = setInterval(() => {
      setStep((s) => (s + 1) % ORCH_STEPS.length)
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <button type="button" className={DEMO_ORCH_HEADER_STATIC} aria-expanded>
        <span className="chevron" />
        <span className="title">编排中 · 续写第二章</span>
      </button>
      {ORCH_STEPS.map((item, i) => (
        <div key={item.name} className={demoOrchLineClass(i <= step)}>
          <span className={demoStatusDotClass(i < step ? 'success' : i === step ? 'loading' : 'idle')} />
          <span className="name">{item.name}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </>
  )
}

function StreamingLoop() {
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setChars(STREAM_TEXT.length)
      return
    }
    let i = 0
    const id = setInterval(() => {
      i = (i + 2) % (STREAM_TEXT.length + 12)
      setChars(i > STREAM_TEXT.length ? STREAM_TEXT.length : i)
      if (i > STREAM_TEXT.length + 8) {
        i = 0
      }
    }, 45)
    return () => clearInterval(id)
  }, [])

  const visible = STREAM_TEXT.slice(0, chars)
  const typing = chars < STREAM_TEXT.length

  return (
    <div className={DEMO_STREAM_BLOCK_FLAT}>
      <div className={DEMO_MINI_STREAM_LINE}>
        <span className="tail">{visible}</span>
        {typing ? <span className={DEMO_MINI_CURSOR} aria-hidden /> : null}
      </div>
    </div>
  )
}

export function MarketingCapabilityMiniDemo({ kind }: { kind: 'orchestrate' | 'stream' }) {
  if (kind === 'orchestrate') {
    return (
      <div className={DEMO_MINI_WRAP}>
        <OrchestrationLoop />
      </div>
    )
  }

  return (
    <div className={DEMO_MINI_WRAP}>
      <div className={DEMO_TOOL_LIST_COMPACT}>
        <div className={DEMO_TOOL_ROW_COMPACT}>
          <span className={demoStatusDotClass('loading')} />
          <div className="body">
            <div className="headline">
              <span className="name">WriteChapter</span>
              <span className="args">流式输出</span>
            </div>
          </div>
        </div>
      </div>
      <StreamingLoop />
    </div>
  )
}
