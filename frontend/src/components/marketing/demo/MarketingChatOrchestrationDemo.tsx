import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import styled, { keyframes } from 'styled-components'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import { MarketingChatDemoFrame } from '../../../styles/surfaces/marketingEditorShowcase'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'
import { editorTheme, palette } from '../../../styles/editorTheme'
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
    loopMs: 16_500,
    sendAt: 2_400,
    promptAt: 2_850,
    agentAt: 3_450,
    runEnd: 14_500,
    outputAt: 6_500,
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
    prompt: '按刚才的结构，续写第二章开头。',
    think: '对齐第一章结尾语气，从银月森林入口切入，先写环境再进战斗。',
    firstTool: '写入章节',
    secondTool: '',
    output:
      '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。他深吸一口气，握紧了拳头——银月森林的首战，从现在开始。',
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
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: [0, 0.15] },
    )
    io.observe(el)
    return () => io.disconnect()
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
  const Frame = variant === 'hero' ? HeroFrame : StoryFrame

  const state = useMemo(() => {
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
      return {
        ...base,
        writeVisible: elapsed >= timing.agentAt + 1_600,
        writeActive: elapsed >= timing.agentAt + 1_600 && elapsed < timing.outputAt - 400,
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
      <Frame className="demo-app-mock demo-agent-console">
        <DemoShell>
          <DemoBody>
            <DemoHeader>{copy.title}</DemoHeader>
            {state.promptVisible ? <PromptBubble>{copy.prompt}</PromptBubble> : null}

            <Timeline>
              {state.orchestrationVisible ? (
                <StatusLine>
                  <TimelineIcon $status="loading">
                    <ToolIcon name="reasoning" size={14} animate />
                  </TimelineIcon>
                  <strong>编排中…</strong>
                </StatusLine>
              ) : null}

              {state.thinkVisible ? (
                <ThinkBlock $expanded={state.thinkExpanded}>
                  <StepTitle>
                    <TimelineIcon $status={state.thinkActive ? 'loading' : 'success'}>
                      <ToolIcon name="think" size={14} animate={state.thinkActive} />
                    </TimelineIcon>
                    <span>思考</span>
                    <StepMeta>
                      {state.thinkActive ? '进行中 · 4 秒' : '已完成 · 4 秒'}
                    </StepMeta>
                  </StepTitle>
                  {state.thinkExpanded ? (
                    <ThinkBody>{state.thinkText || '正在梳理章节上下文…'}</ThinkBody>
                  ) : null}
                </ThinkBlock>
              ) : null}

              {scene === 'subagent' ? (
                state.subagentVisible ? (
                  <SubagentDemoPanel
                    active={state.subagentActive}
                    thinkVisible={state.subagentThinkVisible}
                    memoryVisible={state.subagentMemoryVisible}
                    memoryActive={state.subagentMemoryActive}
                    outputVisible={state.subagentOutputVisible}
                    outputActive={state.subagentOutputActive}
                    complete={state.subagentComplete}
                  />
                ) : null
              ) : scene === 'think' ? (
                <>
                  {'planVisible' in state && state.planVisible ? (
                    <ToolRow $active={'planActive' in state && Boolean(state.planActive)}>
                      <TimelineIcon
                        $status={
                          'planActive' in state && state.planActive ? 'loading' : 'success'
                        }
                      >
                        <ToolIcon
                          name="TodoWrite"
                          size={14}
                          animate={'planActive' in state && Boolean(state.planActive)}
                        />
                      </TimelineIcon>
                      <span>{copy.firstTool}</span>
                      <StepMeta>
                        {'planActive' in state && state.planActive
                          ? '进行中'
                          : '已完成 · 首战 → 掉宝 → 钩子'}
                      </StepMeta>
                    </ToolRow>
                  ) : null}
                </>
              ) : scene === 'stream' ? (
                <>
                  {'writeVisible' in state && state.writeVisible ? (
                    <ToolRow $active={'writeActive' in state && Boolean(state.writeActive)}>
                      <TimelineIcon
                        $status={
                          'writeActive' in state && state.writeActive ? 'loading' : 'success'
                        }
                      >
                        <ToolIcon
                          name="Write"
                          size={14}
                          animate={'writeActive' in state && Boolean(state.writeActive)}
                        />
                      </TimelineIcon>
                      <span>{copy.firstTool}</span>
                      <StepMeta>
                        {'writeActive' in state && state.writeActive
                          ? '进行中 · 流式写入'
                          : '已完成 · 第二章开头'}
                      </StepMeta>
                    </ToolRow>
                  ) : null}
                </>
              ) : (
                <>
                  {state.memoryVisible ? (
                    <ToolRow $active={state.memoryActive}>
                      <TimelineIcon $status={state.memoryActive ? 'loading' : 'success'}>
                        <ToolIcon name="Read" size={14} animate={state.memoryActive} />
                      </TimelineIcon>
                      <span>{copy.firstTool}</span>
                      <StepMeta>{state.memoryActive ? '进行中' : '已完成 · 读取内容'}</StepMeta>
                    </ToolRow>
                  ) : null}

                  {state.chapterVisible ? (
                    <ToolRow $active={state.chapterActive}>
                      <TimelineIcon $status={state.chapterActive ? 'loading' : 'success'}>
                        <ToolIcon name="Read" size={14} animate={state.chapterActive} />
                      </TimelineIcon>
                      <span>{copy.secondTool}</span>
                      <StepMeta>{state.chapterActive ? '进行中' : '已完成 · 第一章 · 天赋觉醒'}</StepMeta>
                    </ToolRow>
                  ) : null}
                </>
              )}
            </Timeline>

            {state.outputVisible ? (
              <OutputText>{state.outputText || '开始输出正文…'}</OutputText>
            ) : (
              <EmptyHint>
                <TimelineIcon $status="idle">
                  <ToolIcon name="Agent" size={14} />
                </TimelineIcon>
                {state.promptVisible ? '等待编排完成后开始流式输出正文' : '输入指令后启动 Agent'}
              </EmptyHint>
            )}
          </DemoBody>

          <DemoComposer $sending={state.sending} $streaming={state.runActive}>
            <ComposerCard>
              <ComposerText>
                {state.composerText ||
                  (state.showComposerPlaceholder ? (
                    <Placeholder>给 AI 发送消息...</Placeholder>
                  ) : null)}
              </ComposerText>
              <ComposerActionRow>
                <HostModeMock>
                  <span>托管</span>
                  <SwitchMock />
                </HostModeMock>
                <SendButton $sending={state.sending} $streaming={state.runActive}>
                  {state.runActive ? <StopIcon /> : <ArrowUpIcon />}
                </SendButton>
              </ComposerActionRow>
            </ComposerCard>
            <ComposerDisclaimer>内容由 AI 生成，请谨慎参考</ComposerDisclaimer>
          </DemoComposer>
        </DemoShell>
      </Frame>
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
    <SubagentWrap>
      <SubagentHeader>
        <TimelineIcon $status={active ? 'loading' : 'success'}>
          <ToolIcon name="Agent" size={14} animate={active} />
        </TimelineIcon>
        <SubagentTitle>子代理 · 角色校对</SubagentTitle>
        <StepMeta>
          {active ? '运行中 · 12 turns' : '已完成 · 角色校对'}
        </StepMeta>
      </SubagentHeader>

      <SubagentBranch>
        {thinkVisible ? (
          <SubagentLine>
            <SubagentDot $active={active && !memoryVisible} />
            <span>校对角色卡与当前章节语气</span>
          </SubagentLine>
        ) : null}
        {memoryVisible ? (
          <SubagentLine>
            <SubagentDot $active={memoryActive} />
            <span>读取角色卡</span>
            <StepMeta>
              {memoryActive ? '进行中' : '已完成 · Tang Yun 人设无冲突'}
            </StepMeta>
          </SubagentLine>
        ) : null}
        {outputVisible ? (
          <SubagentLine>
            <SubagentDot $active={outputActive} />
            <span>校对摘要</span>
            <StepMeta>
              {outputActive ? '进行中' : '已完成 · 已同步至记忆'}
            </StepMeta>
          </SubagentLine>
        ) : null}
        {complete ? (
          <SubagentSummary>角色校对完成，可安全续写第二章。</SubagentSummary>
        ) : null}
      </SubagentBranch>
    </SubagentWrap>
  )
}

const HeroFrame = styled(MarketingChatDemoFrame)`
  height: min(460px, 58vh);
  max-width: 640px;
  margin: 0 auto;
  box-shadow: ${cursorTheme.shadowSm};
  border-color: ${cursorTheme.border};
`

const StoryFrame = styled(MarketingChatDemoFrame)`
  height: min(560px, 66vh);
  min-height: 460px;
`

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const DemoShell = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1.5rem 1rem;
  background: ${editorTheme.bg};
  color: ${editorTheme.text};
  overflow: hidden;
`

const DemoBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const DemoHeader = styled.div`
  flex-shrink: 0;
  font-size: 0.92rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: ${editorTheme.text};
`

const PromptBubble = styled.div`
  align-self: flex-end;
  max-width: min(70%, 26rem);
  margin: 0.95rem 0 1.25rem;
  padding: 0.6rem 1rem;
  border: 1px solid rgba(79, 70, 229, 0.14);
  border-radius: 18px;
  background: ${editorTheme.accentSoft};
  color: ${editorTheme.text};
  font-size: 0.88rem;
  line-height: 1.62;
  font-weight: 400;
  box-shadow: none;
`

const Timeline = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
`

const StatusLine = styled.div`
  animation: ${fadeUp} 0.22s ease-out;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${editorTheme.textSecondary};
  font-size: 0.84rem;
  font-weight: 600;
`

const ThinkBlock = styled.div<{ $expanded: boolean }>`
  animation: ${fadeUp} 0.22s ease-out;
  position: relative;
  padding-left: 0;

  ${({ $expanded }) =>
    $expanded &&
    `
      &::before {
        content: '';
        position: absolute;
        left: 0.62rem;
        top: 1.45rem;
        bottom: 0.05rem;
        width: 2px;
        border-radius: 1px;
        background: ${editorTheme.border};
      }
    `}
`

const StepTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1.3rem;
  color: ${editorTheme.textSecondary};
  font-size: 0.84rem;
  font-weight: 600;
`

const StepMeta = styled.span`
  color: ${editorTheme.textMuted};
  font-size: 0.76rem;
  font-weight: 400;
`

const ThinkBody = styled.div`
  margin-top: 0.26rem;
  margin-left: 1.75rem;
  max-width: 92%;
  color: ${editorTheme.textSecondary};
  font-size: 0.82rem;
  line-height: 1.58;
`

const ToolRow = styled.div<{ $active: boolean }>`
  animation: ${fadeUp} 0.22s ease-out;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-left: 1.75rem;
  color: ${editorTheme.textSecondary};
  font-size: 0.84rem;
  font-weight: 600;
`

const SubagentWrap = styled.div`
  animation: ${fadeUp} 0.22s ease-out;
  padding-left: 1.75rem;
`

const SubagentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1.35rem;
`

const SubagentTitle = styled.span`
  color: ${editorTheme.textSecondary};
  font-size: 0.84rem;
  font-weight: 600;
`

const SubagentBranch = styled.div`
  position: relative;
  margin: 0.2rem 0 0 0.68rem;
  padding: 0.2rem 0 0.05rem 1rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0.15rem;
    width: 1.5px;
    border-radius: 1px;
    background: ${editorTheme.border};
  }
`

const SubagentLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 1.35rem;
  color: ${editorTheme.textSecondary};
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
`

const SubagentDot = styled.span<{ $active: boolean }>`
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? editorTheme.accent : editorTheme.textMuted)};
  box-shadow: ${({ $active }) =>
    $active ? `0 0 0 3px ${palette.accentSoft}` : 'none'};
  opacity: ${({ $active }) => ($active ? 0.9 : 0.55)};
`

const SubagentSummary = styled.div`
  margin-top: 0.22rem;
  color: ${editorTheme.textMuted};
  font-size: 0.78rem;
  line-height: 1.5;
`

const OutputText = styled.p`
  animation: ${fadeUp} 0.22s ease-out;
  margin: 1.25rem 0 0;
  max-width: 100%;
  color: ${editorTheme.text};
  font-size: clamp(0.92rem, 1.6vw, 1.02rem);
  line-height: 1.78;
  letter-spacing: 0.01em;
`

const EmptyHint = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${editorTheme.textMuted};
  font-size: 0.78rem;
`

function iconColor(status: 'loading' | 'success' | 'idle') {
  if (status === 'loading') return editorTheme.textMuted
  if (status === 'success') return palette.accent
  return palette.textFaint
}

const TimelineIcon = styled.span<{ $status: 'loading' | 'success' | 'idle' }>`
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  flex: 0 0 1.35rem;
  align-items: center;
  justify-content: center;
  color: ${({ $status }) => iconColor($status)};
`

const DemoComposer = styled.div<{ $sending: boolean; $streaming: boolean }>`
  flex-shrink: 0;
  width: 100%;
  margin-top: 0.9rem;
  opacity: ${({ $sending }) => ($sending ? 0.9 : 1)};
  transform: translateY(${({ $sending }) => ($sending ? '1px' : '0')});
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
`

const ComposerCard = styled.div`
  width: min(92%, 520px);
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: ${editorTheme.radiusMd};
  box-shadow:
    0 18px 48px rgba(15, 23, 42, 0.08),
    0 2px 8px rgba(15, 23, 42, 0.04);
  padding: 0.45rem 0.65rem 0.42rem;
  box-sizing: border-box;
`

const ComposerText = styled.div`
  min-height: 2.5rem;
  padding: 0.12rem 0.1rem;
  color: ${editorTheme.text};
  font-size: 0.86rem;
  line-height: 1.45;
  white-space: pre-wrap;
`

const Placeholder = styled.span`
  color: ${editorTheme.textMuted};
`

const ComposerActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const HostModeMock = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${editorTheme.textSecondary};
  font-size: 0.72rem;
  font-weight: 600;
`

const SwitchMock = styled.span`
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: ${palette.bgInset};
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.16);

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 4px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
  }
`

const SendButton = styled.span<{ $sending: boolean; $streaming: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ $streaming }) => ($streaming ? '10px' : '11px')};
  color: #fff;
  background: ${({ $streaming }) => ($streaming ? '#ef4444' : editorTheme.accent)};
  opacity: ${({ $sending }) => ($sending ? 0.88 : 1)};
  transform: scale(${({ $sending }) => ($sending ? 0.94 : 1)});
  transition:
    background 0.12s ease,
    border-radius 0.12s ease,
    opacity 0.12s ease,
    transform 0.12s ease;

  svg {
    width: 17px;
    height: 17px;
  }
`

const ComposerDisclaimer = styled.p`
  margin: 0.28rem 0 0;
  text-align: center;
  color: ${editorTheme.textMuted};
  font-size: 0.66rem;
`

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
