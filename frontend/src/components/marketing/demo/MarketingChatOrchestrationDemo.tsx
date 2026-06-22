import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import {
  MARKETING_CHAT_DEMO_FRAME_HERO,
  MARKETING_CHAT_DEMO_FRAME_STORY,
} from '@/lib/marketingEditorShowcaseClasses'
import {
  ORCH_DEMO_BODY,
  ORCH_DEMO_COMPOSER_ACTION_ROW,
  ORCH_DEMO_COMPOSER_CARD,
  ORCH_DEMO_COMPOSER_DISCLAIMER,
  ORCH_DEMO_COMPOSER_PLACEHOLDER,
  ORCH_DEMO_COMPOSER_TEXT,
  ORCH_DEMO_EMPTY_HINT,
  ORCH_DEMO_HEADER,
  ORCH_DEMO_HOST_MODE,
  ORCH_DEMO_OUTPUT_TEXT,
  ORCH_DEMO_PROMPT_BUBBLE,
  ORCH_DEMO_SHELL,
  ORCH_DEMO_STATUS_LINE,
  ORCH_DEMO_STEP_META,
  ORCH_DEMO_STEP_TITLE,
  ORCH_DEMO_SUBAGENT_BRANCH,
  ORCH_DEMO_SUBAGENT_HEADER,
  ORCH_DEMO_SUBAGENT_LINE,
  ORCH_DEMO_SUBAGENT_SUMMARY,
  ORCH_DEMO_SUBAGENT_TITLE,
  ORCH_DEMO_SUBAGENT_WRAP,
  ORCH_DEMO_SWITCH_MOCK,
  ORCH_DEMO_THINK_BODY,
  ORCH_DEMO_TIMELINE,
  ORCH_DEMO_TOOL_ROW,
  orchDemoComposerClass,
  orchDemoSendButtonClass,
  orchDemoSubagentDotClass,
  orchDemoThinkBlockClass,
  orchDemoTimelineIconClass,
} from '@/lib/marketingOrchestrationDemoClasses'
import { scrollProgressToElapsed } from '@/lib/marketingStoryScroll'
import { useOrchestrationTimelineAutoscroll } from '@/hooks/marketing/useOrchestrationTimelineAutoscroll'
import { ToolIcon } from '../../../utils/toolIcons'

const SCENE_TIMING: Record<
  MarketingSceneId,
  {
    loopMs: number
    sendAt: number
    promptAt: number
    agentAt: number
    runEnd: number
    outputAt: number
  }
> = {
  think: {
    loopMs: 14_200,
    sendAt: 2_200,
    promptAt: 2_600,
    agentAt: 3_000,
    runEnd: 12_000,
    outputAt: 9_200,
  },
  orchestrate: {
    loopMs: 17_200,
    sendAt: 2_650,
    promptAt: 3_250,
    agentAt: 3_850,
    runEnd: 15_500,
    outputAt: 11_500,
  },
  subagent: {
    loopMs: 16_800,
    sendAt: 2_500,
    promptAt: 3_100,
    agentAt: 3_700,
    runEnd: 15_200,
    outputAt: 11_800,
  },
  stream: {
    loopMs: 19_000,
    sendAt: 2_400,
    promptAt: 2_850,
    agentAt: 3_450,
    runEnd: 17_500,
    outputAt: 11_000,
  },
}

export interface MarketingChatOrchestrationDemoProps {
  scene: MarketingSceneId
  /** hero 区紧凑卡片；分镜区全高 */
  variant?: 'hero' | 'story'
  /** 分镜区传入 section ref 以控制进入视口后播放 */
  sectionRef?: RefObject<HTMLElement | null>
  /** 滚动进度 0–1；传入时替代纯 timer 循环（story 分镜） */
  scrollProgress?: number
  /** 移动端：进入视口后自动循环播放 */
  autoPlayInView?: boolean
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function revealText(text: string | undefined, startedAt: number, at: number, duration: number) {
  if (!text) return ''
  const progress = clamp01((at - startedAt) / duration)
  const chars = Array.from(text)
  return chars.slice(0, Math.round(chars.length * progress)).join('')
}

interface DemoPlaybackState {
  composerText: string
  showComposerPlaceholder: boolean
  runActive: boolean
  sending: boolean
  promptVisible: boolean
  orchestrationVisible: boolean
  thinkVisible: boolean
  thinkActive: boolean
  thinkExpanded: boolean
  thinkText: string
  outputVisible: boolean
  outputText: string
  planVisible?: boolean
  planActive?: boolean
  writeVisible?: boolean
  writeActive?: boolean
  subagentVisible?: boolean
  subagentActive?: boolean
  subagentThinkVisible?: boolean
  subagentMemoryVisible?: boolean
  subagentMemoryActive?: boolean
  subagentOutputVisible?: boolean
  subagentOutputActive?: boolean
  subagentComplete?: boolean
  memoryVisible?: boolean
  memoryActive?: boolean
  chapterVisible?: boolean
  chapterActive?: boolean
}

function useVisiblePlayback(
  ref: RefObject<HTMLElement | null>,
  autoPlay: boolean,
  loopMs: number,
  inViewAutoplay?: boolean,
) {
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(autoPlay)

  useEffect(() => {
    if (autoPlay) {
      setVisible(true)
      return
    }
    if (!inViewAutoplay) {
      setVisible(false)
      return
    }
    let io: IntersectionObserver | null = null
    let cancelled = false
    let retryRaf = 0

    const attach = () => {
      if (cancelled) return
      const el = ref.current
      if (!el) {
        retryRaf = requestAnimationFrame(attach)
        return
      }
      io?.disconnect()
      io = new IntersectionObserver(
        ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
        { threshold: [0, 0.15] },
      )
      io.observe(el)
    }

    attach()
    return () => {
      cancelled = true
      cancelAnimationFrame(retryRaf)
      io?.disconnect()
    }
  }, [autoPlay, ref, inViewAutoplay])

  useEffect(() => {
    if (!visible) {
      setElapsed(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setElapsed((now - start) % loopMs)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, loopMs])

  return elapsed
}

/** 首页专用轻量演示：按真实 Agent 节奏逐步播放，不复用可交互聊天面板。 */
export function MarketingChatOrchestrationDemo({
  scene,
  variant = 'story',
  sectionRef,
  scrollProgress,
  autoPlayInView = false,
}: MarketingChatOrchestrationDemoProps) {
  const { t } = useTranslation('marketing')
  const fallbackRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const rootRef = sectionRef ?? fallbackRef
  const timing = SCENE_TIMING[scene]
  const useScroll = scrollProgress !== undefined && variant === 'story'
  const timerElapsed = useVisiblePlayback(
    rootRef,
    variant === 'hero',
    timing.loopMs,
    autoPlayInView && variant === 'story',
  )

  const elapsed = useMemo(() => {
    if (useScroll && scrollProgress !== undefined) {
      return scrollProgressToElapsed(scrollProgress, timing)
    }
    return timerElapsed
  }, [useScroll, scrollProgress, timing, timerElapsed])
  const labels = t('home.story.demo.labels', { returnObjects: true }) as Record<string, string>
  const copy = t(`home.story.demo.${scene}`, { returnObjects: true }) as {
    title: string
    prompt: string
    think: string
    firstTool: string
    secondTool?: string
    output: string
    planMetaActive?: string
    planMetaDone?: string
    memoryMetaActive?: string
    memoryMetaDone?: string
    chapterMetaActive?: string
    chapterMetaDone?: string
    writeMetaActive?: string
    writeMetaDone?: string
  }
  const frameClass =
    variant === 'hero' ? MARKETING_CHAT_DEMO_FRAME_HERO : MARKETING_CHAT_DEMO_FRAME_STORY

  const state = useMemo((): DemoPlaybackState => {
    const inputText = revealText(copy.prompt, 250, elapsed, 1_900)
    const runActive = elapsed >= timing.sendAt && elapsed < timing.runEnd
    const sending = elapsed >= timing.sendAt && elapsed < timing.sendAt + 280
    const composerText = elapsed >= timing.sendAt ? '' : inputText
    const thinkText = revealText(copy.think, timing.agentAt + 600, elapsed, 2_700)
    const outputText = revealText(copy.output, timing.outputAt, elapsed, 3_200)

    const base = {
      composerText,
      showComposerPlaceholder: elapsed < 250,
      runActive,
      sending,
      promptVisible: elapsed >= timing.promptAt,
      orchestrationVisible: elapsed >= timing.agentAt,
      thinkVisible: elapsed >= timing.agentAt + 200,
      thinkActive: elapsed >= timing.agentAt + 500 && elapsed < timing.agentAt + 3_400,
      thinkExpanded: elapsed >= timing.agentAt + 500 && elapsed < timing.agentAt + 3_700,
      thinkText,
      outputVisible: elapsed >= timing.outputAt,
      outputText,
    }

    if (scene === 'think') {
      return {
        ...base,
        planVisible: elapsed >= timing.agentAt + 3_900,
        planActive: elapsed >= timing.agentAt + 3_900 && elapsed < timing.agentAt + 5_200,
      }
    }

    if (scene === 'stream') {
      const thinkStart = timing.agentAt + 600
      const thinkEnd = timing.agentAt + 4_200
      const writeStart = timing.agentAt + 4_700
      const writeEnd = timing.agentAt + 7_300
      const outputStart = timing.agentAt + 7_900

      return {
        ...base,
        thinkText: revealText(copy.think, thinkStart, elapsed, 3_200),
        thinkVisible: elapsed >= timing.agentAt + 350,
        thinkActive: elapsed >= thinkStart && elapsed < thinkEnd,
        thinkExpanded: elapsed >= thinkStart && elapsed < thinkEnd + 450,
        writeVisible: elapsed >= writeStart,
        writeActive: elapsed >= writeStart && elapsed < writeEnd,
        outputVisible: elapsed >= outputStart,
        outputText: revealText(copy.output, outputStart, elapsed, 3_400),
      }
    }

    if (scene === 'subagent') {
      return {
        ...base,
        subagentVisible: elapsed >= 8_550,
        subagentActive: elapsed >= 8_550 && elapsed < 11_200,
        subagentThinkVisible: elapsed >= 8_850,
        subagentMemoryVisible: elapsed >= 9_450,
        subagentMemoryActive: elapsed >= 9_450 && elapsed < 10_050,
        subagentOutputVisible: elapsed >= 10_250,
        subagentOutputActive: elapsed >= 10_250 && elapsed < 10_900,
        subagentComplete: elapsed >= 11_050,
      }
    }

    return {
      ...base,
      memoryVisible: elapsed >= 8_550,
      memoryActive: elapsed >= 8_550 && elapsed < 9_550,
      chapterVisible: elapsed >= 9_900,
      chapterActive: elapsed >= 9_900 && elapsed < 10_900,
    }
  }, [copy, elapsed, scene, timing])

  const timelineTick =
    Number(state.promptVisible) +
    Number(state.orchestrationVisible) +
    Number(state.thinkVisible) +
    Number(state.thinkExpanded) +
    Number(state.planVisible) +
    Number(state.memoryVisible) +
    Number(state.chapterVisible) +
    Number(state.writeVisible) +
    Number(state.subagentVisible) +
    Number(state.outputVisible) +
    state.thinkText.length +
    state.outputText.length

  useOrchestrationTimelineAutoscroll(timelineRef, timelineTick, variant === 'story')

  return (
    <div ref={sectionRef ? undefined : fallbackRef}>
      <div className={`${frameClass} demo-agent-console`}>
        <div className={ORCH_DEMO_SHELL}>
          <div className={ORCH_DEMO_BODY}>
            <div className={ORCH_DEMO_HEADER}>{copy.title}</div>
            {state.promptVisible ? (
              <div className={ORCH_DEMO_PROMPT_BUBBLE}>{copy.prompt}</div>
            ) : null}

            <div ref={timelineRef} className={ORCH_DEMO_TIMELINE}>
              {state.orchestrationVisible ? (
                <div className={ORCH_DEMO_STATUS_LINE}>
                  <span className={orchDemoTimelineIconClass('loading')}>
                    <ToolIcon name="reasoning" size={14} animate />
                  </span>
                  <strong>{labels.orchestrating}</strong>
                </div>
              ) : null}

              {state.thinkVisible ? (
                <div className={orchDemoThinkBlockClass(state.thinkExpanded)}>
                  <div className={ORCH_DEMO_STEP_TITLE}>
                    <span
                      className={orchDemoTimelineIconClass(state.thinkActive ? 'loading' : 'success')}
                    >
                      <ToolIcon name="think" size={14} animate={state.thinkActive} />
                    </span>
                    <span>{labels.thinking}</span>
                    <span className={ORCH_DEMO_STEP_META}>
                      {state.thinkActive ? labels.thinkingActive : labels.thinkingDone}
                    </span>
                  </div>
                  {state.thinkExpanded ? (
                    <div className={ORCH_DEMO_THINK_BODY}>
                      {state.thinkText || labels.thinkingFallback}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {scene === 'subagent' ? (
                state.subagentVisible ? (
                  <SubagentDemoPanel
                    labels={labels}
                    active={Boolean(state.subagentActive)}
                    thinkVisible={Boolean(state.subagentThinkVisible)}
                    memoryVisible={Boolean(state.subagentMemoryVisible)}
                    memoryActive={Boolean(state.subagentMemoryActive)}
                    outputVisible={Boolean(state.subagentOutputVisible)}
                    outputActive={Boolean(state.subagentOutputActive)}
                    complete={Boolean(state.subagentComplete)}
                  />
                ) : null
              ) : scene === 'think' ? (
                state.planVisible ? (
                  <div className={ORCH_DEMO_TOOL_ROW}>
                    <span
                      className={orchDemoTimelineIconClass(state.planActive ? 'loading' : 'success')}
                    >
                      <ToolIcon name="TodoWrite" size={14} animate={Boolean(state.planActive)} />
                    </span>
                    <span>{copy.firstTool}</span>
                    <span className={ORCH_DEMO_STEP_META}>
                      {state.planActive
                        ? copy.planMetaActive ?? labels.inProgress
                        : copy.planMetaDone ?? labels.done}
                    </span>
                  </div>
                ) : null
              ) : scene === 'stream' ? (
                state.writeVisible ? (
                  <div className={ORCH_DEMO_TOOL_ROW}>
                    <span
                      className={orchDemoTimelineIconClass(state.writeActive ? 'loading' : 'success')}
                    >
                      <ToolIcon name="Write" size={14} animate={Boolean(state.writeActive)} />
                    </span>
                    <span>{copy.firstTool}</span>
                    <span className={ORCH_DEMO_STEP_META}>
                      {state.writeActive
                        ? copy.writeMetaActive ?? labels.inProgress
                        : copy.writeMetaDone ?? labels.done}
                    </span>
                  </div>
                ) : null
              ) : (
                <>
                  {state.memoryVisible ? (
                    <div className={ORCH_DEMO_TOOL_ROW}>
                      <span
                        className={orchDemoTimelineIconClass(state.memoryActive ? 'loading' : 'success')}
                      >
                        <ToolIcon name="Read" size={14} animate={Boolean(state.memoryActive)} />
                      </span>
                      <span>{copy.firstTool}</span>
                      <span className={ORCH_DEMO_STEP_META}>
                        {state.memoryActive
                          ? copy.memoryMetaActive ?? labels.inProgress
                          : copy.memoryMetaDone ?? labels.done}
                      </span>
                    </div>
                  ) : null}

                  {state.chapterVisible ? (
                    <div className={ORCH_DEMO_TOOL_ROW}>
                      <span
                        className={orchDemoTimelineIconClass(state.chapterActive ? 'loading' : 'success')}
                      >
                        <ToolIcon name="Read" size={14} animate={Boolean(state.chapterActive)} />
                      </span>
                      <span>{copy.secondTool}</span>
                      <span className={ORCH_DEMO_STEP_META}>
                        {state.chapterActive
                          ? copy.chapterMetaActive ?? labels.inProgress
                          : copy.chapterMetaDone ?? labels.done}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {state.outputVisible ? (
              <p className={ORCH_DEMO_OUTPUT_TEXT}>{state.outputText || labels.outputFallback}</p>
            ) : (
              <div className={ORCH_DEMO_EMPTY_HINT}>
                <span className={orchDemoTimelineIconClass('idle')}>
                  <ToolIcon name="Agent" size={14} />
                </span>
                {state.promptVisible ? labels.emptyAfterPrompt : labels.emptyBeforePrompt}
              </div>
            )}
          </div>

          <div className={orchDemoComposerClass(state.sending)}>
            <div className={ORCH_DEMO_COMPOSER_CARD}>
              <div className={ORCH_DEMO_COMPOSER_TEXT}>
                {state.composerText ||
                  (state.showComposerPlaceholder ? (
                    <span className={ORCH_DEMO_COMPOSER_PLACEHOLDER}>
                      {labels.composerPlaceholder}
                    </span>
                  ) : null)}
              </div>
              <div className={ORCH_DEMO_COMPOSER_ACTION_ROW}>
                <div className={ORCH_DEMO_HOST_MODE}>
                  <span>{labels.hostMode}</span>
                  <span className={ORCH_DEMO_SWITCH_MOCK} />
                </div>
                <span className={orchDemoSendButtonClass(state.sending, state.runActive)}>
                  {state.runActive ? <StopIcon /> : <ArrowUpIcon />}
                </span>
              </div>
            </div>
            <p className={ORCH_DEMO_COMPOSER_DISCLAIMER}>{labels.composerDisclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubagentDemoPanel({
  labels,
  active,
  thinkVisible,
  memoryVisible,
  memoryActive,
  outputVisible,
  outputActive,
  complete,
}: {
  labels: Record<string, string>
  active: boolean
  thinkVisible: boolean
  memoryVisible: boolean
  memoryActive: boolean
  outputVisible: boolean
  outputActive: boolean
  complete: boolean
}) {
  return (
    <div className={ORCH_DEMO_SUBAGENT_WRAP}>
      <div className={ORCH_DEMO_SUBAGENT_HEADER}>
        <span className={orchDemoTimelineIconClass(active ? 'loading' : 'success')}>
          <ToolIcon name="Agent" size={14} animate={active} />
        </span>
        <span className={ORCH_DEMO_SUBAGENT_TITLE}>{labels.subagentTitle}</span>
        <span className={ORCH_DEMO_STEP_META}>
          {active ? labels.subagentRunning : labels.subagentDone}
        </span>
      </div>

      <div className={ORCH_DEMO_SUBAGENT_BRANCH}>
        {thinkVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(active && !memoryVisible)} />
            <span>{labels.subagentThink}</span>
          </div>
        ) : null}
        {memoryVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(memoryActive)} />
            <span>{labels.subagentMemory}</span>
            <span className={ORCH_DEMO_STEP_META}>
              {memoryActive ? labels.subagentMemoryActive : labels.subagentMemoryDone}
            </span>
          </div>
        ) : null}
        {outputVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(outputActive)} />
            <span>{labels.subagentOutput}</span>
            <span className={ORCH_DEMO_STEP_META}>
              {outputActive ? labels.subagentOutputActive : labels.subagentOutputDone}
            </span>
          </div>
        ) : null}
        {complete ? (
          <div className={ORCH_DEMO_SUBAGENT_SUMMARY}>{labels.subagentSummary}</div>
        ) : null}
      </div>
    </div>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  )
}
