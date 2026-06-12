import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AgentMarkdown } from './AgentMarkdown'
import {
  CC_BRANCH_CONTENT,
  CC_BRANCH_GLYPH,
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_HEADLINE_ROW,
  CC_TOOL_MAIN,
  CC_TOOL_NAME,
  CC_TOOL_ROW_WRAP,
  HEADLINE_CLUSTER,
  THINK_BODY_IN_ROUND,
  ccToolBranchClass,
  toolLeadCellClass,
} from '@/lib/timelineClasses'
import { TimelineLeadIcon } from './timeline/TimelineLeadIcon'

export interface AgentThinkPanelProps {
  /** 思考正文（Markdown） */
  text?: string
  /** 是否处于思考中（标题扫光 + 可选仅标题行） */
  isThinking: boolean
  expanded?: boolean
  onExpandedChange?: (open: boolean) => void
  /** 完成后用时（秒）；不传则在 isThinking 结束时自动计算 */
  durationSec?: number
  /** 思考中标题，默认「思考」 */
  thinkingTitle?: string
  /** 思考完成标题（无用时），默认「思考」 */
  doneTitle?: string
  /** 思考完成后是否自动收起正文（用户手动点过则不收） */
  autoCollapseWhenDone?: boolean
  markdown?: boolean
  /** 流式输出时在正文末尾显示光标 */
  showCursor?: boolean
  /** 嵌套在编排步骤内时字号略小 */
  nested?: boolean
  /** 编排块已展示动态标题时，隐藏面板内标题行 */
  hideHeader?: boolean
  /** 处于 think_round 内：正文与工具共用左侧竖线 */
  inThinkRound?: boolean
  /** 外层编排进行中：保持思考展开，由编排层统一收起 */
  orchestrationActive?: boolean
  defaultExpanded?: boolean
  className?: string
  'data-testid'?: string
}

function formatThinkStatus(
  isThinking: boolean,
  durationSec: number | undefined,
): { phase: string; duration?: string } {
  if (isThinking) {
    return {
      phase: '进行中',
      duration: durationSec != null && durationSec > 0 ? `${durationSec} 秒` : undefined,
    }
  }
  return {
    phase: '已完成',
    duration: durationSec != null && durationSec >= 1 ? `${durationSec} 秒` : undefined,
  }
}

/** 思考进行中每秒刷新；结束后保留总秒数 */
function useThinkDuration(isThinking: boolean, enabled: boolean): number | undefined {
  const startRef = useRef<number | null>(null)
  const [seconds, setSeconds] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled) {
      return
    }
    if (!isThinking) {
      if (startRef.current != null) {
        const sec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
        setSeconds(sec)
        startRef.current = null
      }
      return
    }
    const start = Date.now()
    startRef.current = start
    const tick = () => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [isThinking, enabled])

  return seconds
}

function thinkBodyClass(nested?: boolean) {
  return cn(
    nested ? 'text-[0.78rem]' : 'text-[0.82rem]',
    'leading-[1.55] text-[#475569] [&_p:last-child]:mb-0 [&_p]:mb-[0.35rem]',
  )
}

export function AgentThinkPanel({
  text = '',
  isThinking,
  expanded: expandedProp,
  onExpandedChange,
  durationSec: durationProp,
  thinkingTitle = '思考',
  doneTitle = '思考',
  autoCollapseWhenDone = true,
  markdown = true,
  showCursor: _showCursor = false,
  nested = false,
  hideHeader = false,
  inThinkRound = false,
  orchestrationActive = false,
  defaultExpanded: defaultExpandedProp,
  className,
  'data-testid': testId = 'agent-think-panel',
}: AgentThinkPanelProps) {
  const bodyId = useId()
  const trimmed = text.trim()
  const hasBody = Boolean(trimmed)
  const autoDuration = useThinkDuration(isThinking, durationProp === undefined)
  const durationSec = durationProp ?? autoDuration
  const userToggledRef = useRef(false)
  const enteredThinkingRef = useRef(isThinking)

  const [internalExpanded, setInternalExpanded] = useState(
    () => defaultExpandedProp ?? false,
  )
  const expanded = expandedProp ?? internalExpanded
  const handleExpandedChange = (open: boolean) => {
    userToggledRef.current = true
    if (typeof onExpandedChange === 'function') {
      onExpandedChange(open)
    }
    if (expandedProp === undefined) {
      setInternalExpanded(open)
    }
  }

  const handleToggleClick = () => {
    if (!canToggle) {
      return
    }
    handleExpandedChange(!expanded)
  }

  useEffect(() => {
    if (expandedProp !== undefined) {
      return
    }
    if (isThinking || orchestrationActive) {
      enteredThinkingRef.current = true
      setInternalExpanded(true)
    }
  }, [isThinking, orchestrationActive, expandedProp])

  useEffect(() => {
    if (expandedProp !== undefined) {
      return
    }
    if (orchestrationActive) {
      return
    }
    if (isThinking || !enteredThinkingRef.current) {
      return
    }
    if (autoCollapseWhenDone && !userToggledRef.current) {
      setInternalExpanded(false)
      enteredThinkingRef.current = false
    }
  }, [isThinking, orchestrationActive, expandedProp, autoCollapseWhenDone])

  if (!isThinking && !hasBody) {
    return null
  }

  const label = isThinking ? thinkingTitle : doneTitle
  const { phase, duration } = formatThinkStatus(isThinking, durationSec)
  const holdExpandedInRound = inThinkRound && orchestrationActive && isThinking
  const canToggle = hasBody && !isThinking && !holdExpandedInRound
  const showBody =
    hasBody && (hideHeader || isThinking || expanded || holdExpandedInRound)

  const bodyContent = (
    <div
      id={bodyId}
      data-testid="agent-think-content"
      className={thinkBodyClass(nested)}
    >
      {markdown ? (
        <AgentMarkdown text={text} variant="think" />
      ) : (
        text.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)
      )}
    </div>
  )

  return (
    <div
      className={cn('w-full', nested ? 'opacity-[0.92]' : 'opacity-100', className)}
      data-testid={testId}
    >
      <div className={CC_TOOL_ROW_WRAP}>
        <div className={CC_TOOL_HEADLINE_ROW}>
          {!hideHeader ? (
            <div className={toolLeadCellClass()}>
              <TimelineLeadIcon
                iconName="think"
                status={isThinking ? 'loading' : 'success'}
              />
            </div>
          ) : null}
          <div className={CC_TOOL_MAIN}>
            {!hideHeader ? (
              <button
                type="button"
                className={CC_TOOL_HEADLINE_BUTTON}
                disabled={!canToggle}
                aria-expanded={canToggle ? expanded : undefined}
                aria-controls={canToggle ? bodyId : undefined}
                onClick={handleToggleClick}
                data-testid="agent-think-toggle"
              >
                <div className={CC_TOOL_HEADLINE}>
                  <span className={HEADLINE_CLUSTER}>
                    <span className={CC_TOOL_NAME}>{label}</span>
                    <span className={CC_TOOL_ARGS}>
                      {phase}
                      {duration ? ` · ${duration}` : ''}
                    </span>
                  </span>
                </div>
              </button>
            ) : null}
          </div>
        </div>

        {showBody ? (
          inThinkRound ? (
            <div className={THINK_BODY_IN_ROUND}>{bodyContent}</div>
          ) : (
            <div className={ccToolBranchClass()}>
              <span className={CC_BRANCH_GLYPH} aria-hidden />
              <div className={CC_BRANCH_CONTENT}>{bodyContent}</div>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
