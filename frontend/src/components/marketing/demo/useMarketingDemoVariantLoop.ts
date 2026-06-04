import { useEffect, useState } from 'react'
import type { MarketingAgentDemoVariant } from './MarketingEditorAppDemo'
import { prefersReducedMotion } from '../scroll/useMarketingGsapEffect'

const HERO_SEQUENCE: MarketingAgentDemoVariant[] = [
  'think',
  'orchestrate',
  'subagent',
  'stream',
]

const STEP_MS = 3200
const PAUSE_MS = 800

/** Hero 区 Agent 演示：think → 编排 → 子代理 → 流式，循环播放 */
export function useMarketingDemoVariantLoop(active = true) {
  const [variant, setVariant] = useState<MarketingAgentDemoVariant>('think')

  useEffect(() => {
    if (!active) return

    if (prefersReducedMotion()) {
      setVariant('stream')
      return
    }

    let idx = 0
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      setVariant(HERO_SEQUENCE[idx]!)
      const atEnd = idx >= HERO_SEQUENCE.length - 1
      idx = atEnd ? 0 : idx + 1
      timer = setTimeout(tick, atEnd ? PAUSE_MS + STEP_MS : STEP_MS)
    }

    tick()
    return () => clearTimeout(timer)
  }, [active])

  return variant
}

export function sceneVariantForStep(
  scene: 'orchestrate' | 'subagent',
  eventStep: number,
  total: number,
): MarketingAgentDemoVariant {
  if (eventStep <= 0) {
    return 'think'
  }
  if (scene === 'orchestrate') {
    if (eventStep >= total) {
      return 'stream'
    }
    return eventStep <= 2 ? 'think' : 'orchestrate'
  }
  if (eventStep >= total) {
    return 'stream'
  }
  return eventStep <= 2 ? 'think' : 'subagent'
}
