import type { AgentTimelineBlock } from '../../../types/agent'
import {
  SelectedBadge,
  SelectedChoiceRow,
  SelectedDesc,
  SelectedTitle,
} from './timelineStyles'

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
    <SelectedChoiceRow data-testid="timeline-choice-selected">
      <SelectedBadge>{badge}</SelectedBadge>
      {lines.length > 1 ? (
        lines.map((line) => <SelectedTitle key={line}>{line}</SelectedTitle>)
      ) : (
        <SelectedTitle>{body || selection.title}</SelectedTitle>
      )}
      {selection.description ? <SelectedDesc>{selection.description}</SelectedDesc> : null}
    </SelectedChoiceRow>
  )
}
