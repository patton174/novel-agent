import { useEffect, useState } from 'react'
import { AgentMarkdown } from '../AgentMarkdown'
import { useEditorMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import {
  DELIVERY_BODY_WRAP,
  DELIVERY_COLLAPSE_TOGGLE,
} from '@/lib/timelineClasses'
import { shouldCollapseDeliveryText } from '@/utils/timelineMobileCollapse'

/** 交付正文：无图标，左缘与编排层同级对齐；移动完成态过长时默认折叠 */
export function TimelineDeliveryBlock({
  text,
  streamLive = false,
  testId = 'assistant-delivery-body',
}: {
  text: string
  streamLive?: boolean
  testId?: string
}) {
  const trimmed = text.trim()
  const isMobile = useEditorMobile()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (streamLive) {
      setExpanded(true)
    }
  }, [streamLive, trimmed])

  if (!trimmed) {
    return null
  }

  const canCollapse = isMobile && !streamLive && shouldCollapseDeliveryText(trimmed)
  const collapsed = canCollapse && !expanded

  return (
    <div className={DELIVERY_BODY_WRAP} data-testid={testId}>
      <div
        className={cn(
          'relative',
          collapsed &&
            'max-h-[calc(6*1.55em)] overflow-hidden max-md:max-h-[calc(6*1.45em)]',
        )}
      >
        <AgentMarkdown text={trimmed} variant="chat" />
        {collapsed ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background via-background/90 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {canCollapse ? (
        <button
          type="button"
          className={DELIVERY_COLLAPSE_TOGGLE}
          onClick={() => setExpanded((open) => !open)}
          data-testid={collapsed ? `${testId}-expand` : `${testId}-collapse`}
        >
          {collapsed ? '展开全文' : '收起'}
        </button>
      ) : null}
    </div>
  )
}
