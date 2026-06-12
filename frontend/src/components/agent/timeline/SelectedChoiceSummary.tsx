import type { AgentTimelineBlock } from '../../../types/agent'
import {
  SELECTED_BADGE,
  SELECTED_CHOICE_ROW,
  SELECTED_DESC,
  SELECTED_TITLE,
} from '@/lib/timelineClasses'

function stripAnswerPrefix(title: string): string {
  return title.replace(/^我的回答[：:]\s*/i, '').trim()
}

/** 已选答案摘要（无额外树形符号；询问仅展示「你的回答」+ 正文） */
export function SelectedChoiceSummary({
  selection,
  badge = '你的选择',
}: {
  selection: Extract<AgentTimelineBlock, { kind: 'choice_selected' }>
  badge?: string
}) {
  const body = stripAnswerPrefix(selection.title)
  const lines = body.split('\n').filter(Boolean)
  return (
    <div className={SELECTED_CHOICE_ROW} data-testid="timeline-choice-selected">
      <span className={SELECTED_BADGE}>{badge}</span>
      {lines.length > 1 ? (
        lines.map((line) => (
          <span key={line} className={SELECTED_TITLE}>
            {line}
          </span>
        ))
      ) : (
        <span className={SELECTED_TITLE}>{body || selection.title}</span>
      )}
      {selection.description ? (
        <span className={SELECTED_DESC}>{selection.description}</span>
      ) : null}
    </div>
  )
}
