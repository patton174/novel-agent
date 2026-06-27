import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

type OrchStep = { name: string; label: string }

function OrchestrationLoop({ steps, title }: { steps: OrchStep[]; title: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStep(steps.length - 1)
      return
    }
    const id = setInterval(() => {
      setStep((s) => (s + 1) % steps.length)
    }, 1400)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <>
      <button type="button" className={DEMO_ORCH_HEADER_STATIC} aria-expanded>
        <span className="chevron" />
        <span className="title">{title}</span>
      </button>
      {steps.map((item, i) => (
        <div key={item.name} className={demoOrchLineClass(i <= step)}>
          <span className={demoStatusDotClass(i < step ? 'success' : i === step ? 'loading' : 'idle')} />
          <span className="name">{item.name}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </>
  )
}

function StreamingLoop({ streamText }: { streamText: string }) {
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setChars(streamText.length)
      return
    }
    let i = 0
    const id = setInterval(() => {
      i = (i + 2) % (streamText.length + 12)
      setChars(i > streamText.length ? streamText.length : i)
      if (i > streamText.length + 8) {
        i = 0
      }
    }, 45)
    return () => clearInterval(id)
  }, [streamText])

  const visible = streamText.slice(0, chars)
  const typing = chars < streamText.length

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
  const { t } = useTranslation('marketing')
  const steps = useMemo(
    () => t('demo.capabilityMini.steps', { returnObjects: true }) as OrchStep[],
    [t],
  )
  const orchTitle = t('demo.capabilityMini.orchTitle')
  const streamArgs = t('demo.capabilityMini.streamArgs')
  const streamText = t('demo.capabilityMini.streamText')

  if (kind === 'orchestrate') {
    return (
      <div className={DEMO_MINI_WRAP}>
        <OrchestrationLoop steps={steps} title={orchTitle} />
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
              <span className="args">{streamArgs}</span>
            </div>
          </div>
        </div>
      </div>
      <StreamingLoop streamText={streamText} />
    </div>
  )
}
