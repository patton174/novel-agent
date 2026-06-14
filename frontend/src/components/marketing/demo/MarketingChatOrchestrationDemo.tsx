import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
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

const SCENE_COPY: Record<
  MarketingSceneId,
  {
    title: string
    prompt: string
    think: string
    firstTool: string
    secondTool: string
    output: string
  }
> = {
  think: {
    title: '规划 · 第二章结构',
    prompt: '帮我规划第二章结构，先想清楚节奏和爽点再动笔。',
    think: '第二章建议：银月森林首战验证掉宝，再触发全服唯一强化石，章末留悬念。',
    firstTool: '生成写作计划',
    secondTool: '',
    output: '结构已定：先小战热身，再集中爆发爽点，可以开始写正文。',
  },
  orchestrate: {
    title: '续写 · 第二章',
    prompt: '继续写第二章，先对齐记忆和第一章结尾。',
    think: '续写前先拉取角色记忆，并阅读第一章结尾以对齐语气与伏笔。',
    firstTool: '查阅记忆',
    secondTool: '阅读章节',
    output:
      '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。他深吸一口气，握紧了拳头——银月森林的首战，从现在开始。',
  },
  subagent: {
    title: '子代理 · 角色校对',
    prompt: '启动子代理校对角色一致性，再进入正文续写。',
    think: '主会话保持简洁，角色校对交给子代理并行处理。',
    firstTool: '读取角色卡',
    secondTool: '合并校对摘要',
    output: '角色校对完成，记忆已同步。可以开始续写第二章正文。',
  },
  stream: {
    title: '续写 · 第二章',
    prompt: '按刚才的结构，续写第二章后半段，重点刻画获得强化石的场景。',
    think: '承接前面的战斗，详细描写蓝光与系统提示，突出『全服唯一』的爽点。',
    firstTool: '写入章节',
    secondTool: '',
    output:
      '随着强化石爆发出耀眼的蓝光，原本普通的短剑瞬间布满繁复的符文。系统提示音在耳边响起：【恭喜获得全服唯一神话级武器『凛冬之握』】',
  },
}

export interface MarketingChatOrchestrationDemoProps {
  scene: MarketingSceneId
  /** hero 区紧凑卡片；分镜区全高 */
  variant?: 'hero' | 'story'
  /** 分镜区传入 section ref 以控制进入视口后播放 */
  sectionRef?: RefObject<HTMLElement | null>
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function revealText(text: string, startedAt: number, elapsed: number, duration: number) {
  const progress = clamp01((elapsed - startedAt) / duration)
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
) {
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(autoPlay)

  useEffect(() => {
    if (autoPlay) {
      setVisible(true)
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
  }, [autoPlay, ref])

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
}: MarketingChatOrchestrationDemoProps) {
  const fallbackRef = useRef<HTMLDivElement>(null)
  const rootRef = sectionRef ?? fallbackRef
  const timing = SCENE_TIMING[scene]
  const elapsed = useVisiblePlayback(rootRef, variant === 'hero', timing.loopMs)
  const copy = SCENE_COPY[scene]
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

  return (
    <div ref={sectionRef ? undefined : fallbackRef}>
      <div className={`${frameClass} demo-app-mock demo-agent-console`}>
        <div className={ORCH_DEMO_SHELL}>
          <div className={ORCH_DEMO_BODY}>
            <div className={ORCH_DEMO_HEADER}>{copy.title}</div>
            {state.promptVisible ? (
              <div className={ORCH_DEMO_PROMPT_BUBBLE}>{copy.prompt}</div>
            ) : null}

            <div className={ORCH_DEMO_TIMELINE}>
              {state.orchestrationVisible ? (
                <div className={ORCH_DEMO_STATUS_LINE}>
                  <span className={orchDemoTimelineIconClass('loading')}>
                    <ToolIcon name="reasoning" size={14} animate />
                  </span>
                  <strong>编排中…</strong>
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
                    <span>思考</span>
                    <span className={ORCH_DEMO_STEP_META}>
                      {state.thinkActive ? '进行中 · 4 秒' : '已完成 · 4 秒'}
                    </span>
                  </div>
                  {state.thinkExpanded ? (
                    <div className={ORCH_DEMO_THINK_BODY}>
                      {state.thinkText || '正在梳理章节上下文…'}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {scene === 'subagent' ? (
                state.subagentVisible ? (
                  <SubagentDemoPanel
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
                <>
                  {state.planVisible ? (
                    <div className={ORCH_DEMO_TOOL_ROW}>
                      <span
                        className={orchDemoTimelineIconClass(state.planActive ? 'loading' : 'success')}
                      >
                        <ToolIcon name="TodoWrite" size={14} animate={Boolean(state.planActive)} />
                      </span>
                      <span>{copy.firstTool}</span>
                      <span className={ORCH_DEMO_STEP_META}>
                        {state.planActive ? '进行中' : '已完成 · 首战 → 掉宝 → 钩子'}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : scene === 'stream' ? (
                <>
                  {state.writeVisible ? (
                    <div className={ORCH_DEMO_TOOL_ROW}>
                      <span
                        className={orchDemoTimelineIconClass(state.writeActive ? 'loading' : 'success')}
                      >
                        <ToolIcon name="Write" size={14} animate={Boolean(state.writeActive)} />
                      </span>
                      <span>{copy.firstTool}</span>
                      <span className={ORCH_DEMO_STEP_META}>
                        {state.writeActive ? '进行中 · 流式写入' : '已完成 · 第二章开头'}
                      </span>
                    </div>
                  ) : null}
                </>
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
                        {state.memoryActive ? '进行中' : '已完成 · 读取内容'}
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
                        {state.chapterActive ? '进行中' : '已完成 · 第一章 · 天赋觉醒'}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {state.outputVisible ? (
              <p className={ORCH_DEMO_OUTPUT_TEXT}>{state.outputText || '开始输出正文…'}</p>
            ) : (
              <div className={ORCH_DEMO_EMPTY_HINT}>
                <span className={orchDemoTimelineIconClass('idle')}>
                  <ToolIcon name="Agent" size={14} />
                </span>
                {state.promptVisible ? '等待编排完成后开始流式输出正文' : '输入指令后启动 Agent'}
              </div>
            )}
          </div>

          <div className={orchDemoComposerClass(state.sending)}>
            <div className={ORCH_DEMO_COMPOSER_CARD}>
              <div className={ORCH_DEMO_COMPOSER_TEXT}>
                {state.composerText ||
                  (state.showComposerPlaceholder ? (
                    <span className={ORCH_DEMO_COMPOSER_PLACEHOLDER}>给 AI 发送消息...</span>
                  ) : null)}
              </div>
              <div className={ORCH_DEMO_COMPOSER_ACTION_ROW}>
                <div className={ORCH_DEMO_HOST_MODE}>
                  <span>托管</span>
                  <span className={ORCH_DEMO_SWITCH_MOCK} />
                </div>
                <span className={orchDemoSendButtonClass(state.sending, state.runActive)}>
                  {state.runActive ? <StopIcon /> : <ArrowUpIcon />}
                </span>
              </div>
            </div>
            <p className={ORCH_DEMO_COMPOSER_DISCLAIMER}>内容由 AI 生成，请谨慎参考</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubagentDemoPanel({
  active,
  thinkVisible,
  memoryVisible,
  memoryActive,
  outputVisible,
  outputActive,
  complete,
}: {
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
        <span className={ORCH_DEMO_SUBAGENT_TITLE}>子代理 · 角色校对</span>
        <span className={ORCH_DEMO_STEP_META}>
          {active ? '运行中 · 12 turns' : '已完成 · 角色校对'}
        </span>
      </div>

      <div className={ORCH_DEMO_SUBAGENT_BRANCH}>
        {thinkVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(active && !memoryVisible)} />
            <span>校对角色卡与当前章节语气</span>
          </div>
        ) : null}
        {memoryVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(memoryActive)} />
            <span>读取角色卡</span>
            <span className={ORCH_DEMO_STEP_META}>
              {memoryActive ? '进行中' : '已完成 · Tang Yun 人设无冲突'}
            </span>
          </div>
        ) : null}
        {outputVisible ? (
          <div className={ORCH_DEMO_SUBAGENT_LINE}>
            <span className={orchDemoSubagentDotClass(outputActive)} />
            <span>校对摘要</span>
            <span className={ORCH_DEMO_STEP_META}>
              {outputActive ? '进行中' : '已完成 · 已同步至记忆'}
            </span>
          </div>
        ) : null}
        {complete ? (
          <div className={ORCH_DEMO_SUBAGENT_SUMMARY}>角色校对完成，可安全续写第二章。</div>
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
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
