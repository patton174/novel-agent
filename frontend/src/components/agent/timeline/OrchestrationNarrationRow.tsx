import { ORCHESTRATION_FLAT_ROW, ORCHESTRATION_NARRATION, TIMELINE_STREAM_CURSOR } from '@/lib/timelineClasses'
import { AgentMarkdown } from '../AgentMarkdown'

/** 编排叙述/交付正文：无图标，与交付区同排版 */
export function OrchestrationNarrationRow({
  text,
  streamLive,
  streamFinished,
  frozen = false,
}: {
  text: string
  streamLive: boolean
  streamFinished: boolean
  frozen?: boolean
}) {
  const isLive = streamLive && !streamFinished && !frozen
  const trimmed = text.trim()

  if (!trimmed && !isLive) {
    return null
  }

  return (
    <div className={ORCHESTRATION_FLAT_ROW} data-testid="orchestration-narration-body">
      <div className={ORCHESTRATION_NARRATION}>
        {trimmed ? (
          <AgentMarkdown text={trimmed} variant="pixel" streaming={isLive} isAnimating={isLive} />
        ) : null}
        {isLive ? <span className={TIMELINE_STREAM_CURSOR} aria-hidden /> : null}
      </div>
    </div>
  )
}
