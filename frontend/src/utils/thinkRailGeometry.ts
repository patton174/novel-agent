export type ThinkRailSegment = {
  left: number
  top: number
  height: number
}

/** 竖线段：上一思考图标下缘 → 下一思考图标上缘（不含图标本身） */
export function computeThinkRailSegment(
  containerRect: Pick<DOMRectReadOnly, 'left' | 'top'>,
  fromLead: Pick<DOMRectReadOnly, 'left' | 'right' | 'bottom'>,
  toLead: Pick<DOMRectReadOnly, 'left' | 'top'>,
  gapPx = 2,
): ThinkRailSegment | null {
  const left = fromLead.left + (fromLead.right - fromLead.left) / 2 - containerRect.left
  const top = fromLead.bottom - containerRect.top + gapPx
  const bottom = toLead.top - containerRect.top - gapPx
  const height = bottom - top
  if (height <= 0) {
    return null
  }
  return { left, top, height }
}

export function computeThinkRailSegments(
  containerRect: Pick<DOMRectReadOnly, 'left' | 'top'>,
  thinkIds: readonly string[],
  leadRects: ReadonlyMap<string, Pick<DOMRectReadOnly, 'left' | 'right' | 'bottom' | 'top'>>,
  gapPx = 2,
): ThinkRailSegment[] {
  const segments: ThinkRailSegment[] = []
  for (let i = 0; i < thinkIds.length - 1; i += 1) {
    const from = leadRects.get(thinkIds[i] ?? '')
    const to = leadRects.get(thinkIds[i + 1] ?? '')
    if (!from || !to) {
      continue
    }
    const segment = computeThinkRailSegment(containerRect, from, to, gapPx)
    if (segment) {
      segments.push(segment)
    }
  }
  return segments
}

/** 图标列与首行标题的视觉中心差（px），用于 E2E 断言 */
export function headlineLeadCenterDelta(
  leadRect: Pick<DOMRectReadOnly, 'top' | 'height'>,
  headlineRect: Pick<DOMRectReadOnly, 'top' | 'height'>,
): number {
  const leadCenter = leadRect.top + leadRect.height / 2
  const headlineCenter = headlineRect.top + headlineRect.height / 2
  return leadCenter - headlineCenter
}
