import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  DemoOrchHeader,
  DemoStatusDot,
  DemoStreamBlock,
  DemoToolList,
  DemoToolRow,
} from '../../../styles/surfaces/marketingAgentDemo'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'
import { prefersReducedMotion } from '../scroll/useMarketingGsapEffect'

const blink = keyframes`
  50% { opacity: 0; }
`

const MiniWrap = styled.div`
  margin-top: 0.85rem;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  background: ${cursorTheme.card};
  border: 1px solid ${cursorTheme.border};
  text-align: left;
  min-height: 5.5rem;
  font-size: 0.72rem;
  color: ${cursorTheme.textMuted};
`

const OrchHeaderStatic = styled(DemoOrchHeader).attrs({ type: 'button' as const })`
  pointer-events: none;
  margin-bottom: 0.35rem;
`

const StreamBlockFlat = styled(DemoStreamBlock)`
  padding: 0;
  background: transparent;
  border: none;
`

const ToolListCompact = styled(DemoToolList)`
  gap: 0.25rem;
`

const ToolRowCompact = styled(DemoToolRow)`
  padding: 0.15rem 0;
`

const OrchLine = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0;
  opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  transition: opacity 0.25s ease;
  color: ${cursorTheme.text};

  .name {
    font-weight: 600;
    font-family: ui-monospace, monospace;
    font-size: 0.68rem;
  }
`

const StreamLine = styled.div`
  line-height: 1.45;
  color: ${cursorTheme.text};

  .tail {
    display: inline;
  }
`

const Cursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 0.85em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: ${cursorTheme.green};
  animation: ${blink} 1s step-end infinite;
`

const ORCH_STEPS = [
  { name: 'memory_read', label: '读取角色记忆' },
  { name: 'chapter_read', label: '对齐第一章结尾' },
  { name: 'plan', label: '规划第二章结构' },
  { name: 'chapter_create', label: '流式写入正文' },
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
      <OrchHeaderStatic aria-expanded>
        <span className="chevron" />
        <span className="title">编排中 · 续写第二章</span>
      </OrchHeaderStatic>
      {ORCH_STEPS.map((item, i) => (
        <OrchLine key={item.name} $active={i <= step}>
          <DemoStatusDot $status={i < step ? 'success' : i === step ? 'loading' : 'idle'} />
          <span className="name">{item.name}</span>
          <span>{item.label}</span>
        </OrchLine>
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
    <StreamBlockFlat>
      <StreamLine>
        {visible}
        {typing ? <Cursor aria-hidden /> : null}
      </StreamLine>
    </StreamBlockFlat>
  )
}

export function MarketingCapabilityMiniDemo({ kind }: { kind: 'orchestrate' | 'stream' }) {
  if (kind === 'orchestrate') {
    return (
      <MiniWrap>
        <OrchestrationLoop />
      </MiniWrap>
    )
  }

  return (
    <MiniWrap>
      <ToolListCompact>
        <ToolRowCompact>
          <DemoStatusDot $status="loading" />
          <div className="body">
            <div className="headline">
              <span className="name">chapter_create</span>
              <span className="args">流式输出</span>
            </div>
          </div>
        </ToolRowCompact>
      </ToolListCompact>
      <StreamingLoop />
    </MiniWrap>
  )
}
