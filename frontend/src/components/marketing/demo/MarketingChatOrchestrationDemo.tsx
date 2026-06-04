import { useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { EditorChatPanel } from '../../editor/EditorChatPanel'
import type { Novel } from '../../../types/novel'
import {
  buildSceneMessagesAtStep,
  sceneIsStreaming,
  scenePlaybackLive,
  type MarketingSceneId,
} from '../../../utils/marketing/buildMarketingSceneDemo'
import { useMarketingScenePlayback } from './useMarketingScenePlayback'
import { MarketingChatDemoFrame } from '../../../styles/surfaces/marketingEditorShowcase'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'

const DEMO_NOVEL: Novel = {
  id: 'demo-novel',
  title: '诸天神祇有价',
  description: '玄幻连载',
  genre: '玄幻',
  targetChapterWords: 3000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const noop = () => {}

const SCENE_META: Record<MarketingSceneId, { sessionTitle: string }> = {
  orchestrate: { sessionTitle: '续写 · 第二章' },
  subagent: { sessionTitle: '子代理 · 角色校对' },
}

const HeroFrame = styled(MarketingChatDemoFrame)`
  height: min(460px, 58vh);
  max-width: 640px;
  margin: 0 auto;
  box-shadow: ${cursorTheme.shadowSm};
  border-color: ${cursorTheme.border};
`

const StoryFrame = styled(MarketingChatDemoFrame)`
  height: min(80vh, 720px);
`

export interface MarketingChatOrchestrationDemoProps {
  scene: MarketingSceneId
  /** hero 区紧凑卡片；分镜区全高 */
  variant?: 'hero' | 'story'
  /** 分镜区传入 section ref 以控制进入视口后播放 */
  sectionRef?: React.RefObject<HTMLElement | null>
}

/** 真实聊天面板 + 流式编排时间线，循环演示 */
export function MarketingChatOrchestrationDemo({
  scene,
  variant = 'story',
  sectionRef,
}: MarketingChatOrchestrationDemoProps) {
  const fallbackRef = useRef<HTMLDivElement>(null)
  const playbackRef = sectionRef ?? fallbackRef
  const messagesAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { eventStep, total } = useMarketingScenePlayback(scene, playbackRef, {
    autoPlay: variant === 'hero',
  })

  const messages = useMemo(
    () => buildSceneMessagesAtStep(scene, eventStep, false),
    [scene, eventStep],
  )
  const playbackLive = scenePlaybackLive(eventStep, total)
  const isLoading = sceneIsStreaming(eventStep, total)
  const assistantId = `demo-assistant-${scene}`
  const meta = SCENE_META[scene]
  const Frame = variant === 'hero' ? HeroFrame : StoryFrame

  useEffect(() => {
    const area = messagesAreaRef.current
    if (area) {
      area.scrollTop = area.scrollHeight
    }
  }, [eventStep, messages])

  return (
    <div ref={sectionRef ? undefined : fallbackRef}>
      <Frame className="demo-agent-console">
        <EditorChatPanel
          sessionTitle={meta.sessionTitle}
          activeNovel={DEMO_NOVEL}
          messages={messages}
          inputValue=""
          onInputChange={noop}
          onSend={noop}
          isLoading={isLoading}
          marketingScrubPlaying={playbackLive}
          marketingPinOrchestration={playbackLive}
          hostModeEnabled={false}
          onHostModeChange={noop}
          onStreamAbort={noop}
          activeStreamMessageId={eventStep > 0 ? assistantId : null}
          thinkPanelOpen={{ [assistantId]: true }}
          onThinkPanelChange={noop}
          onSelectChoice={noop}
          onSubmitInteraction={noop}
          messagesAreaRef={messagesAreaRef}
          messagesEndRef={messagesEndRef}
        />
      </Frame>
    </div>
  )
}
