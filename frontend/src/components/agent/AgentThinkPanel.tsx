import { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { AgentMarkdown } from './AgentMarkdown'
import {
  CcBranchContent,
  CcBranchGlyph,
  CcToolArgs,
  CcToolBranch,
  CcToolHeadline,
  CcToolHeadlineButton,
  CcToolMain,
  CcToolName,
  CcToolHeadlineRow,
  CcToolRowWrap,
  HeadlineCluster,
  ToolLeadCell,
  ThinkBodyInRound,
} from './timeline/timelineStyles'
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
  showCursor = false,
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
  const setExpanded = (open: boolean) => {
    userToggledRef.current = true
    onExpandedChange?.(open)
    if (expandedProp === undefined) {
      setInternalExpanded(open)
    }
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

  return (
    <Root className={className} data-testid={testId} $nested={nested}>
      <CcToolRowWrap>
        <CcToolHeadlineRow>
          {!hideHeader ? (
            <ToolLeadCell>
              <TimelineLeadIcon
                iconName="think"
                status={isThinking ? 'loading' : 'success'}
              />
            </ToolLeadCell>
          ) : null}
          <CcToolMain>
            {!hideHeader ? (
              <CcToolHeadlineButton
                type="button"
                disabled={!canToggle}
                aria-expanded={canToggle ? expanded : undefined}
                aria-controls={canToggle ? bodyId : undefined}
                onClick={() => canToggle && setExpanded(!expanded)}
                data-testid="agent-think-toggle"
              >
                <CcToolHeadline>
                  <HeadlineCluster>
                    <CcToolName>{label}</CcToolName>
                    <CcToolArgs>
                      {phase}
                      {duration ? ` · ${duration}` : ''}
                    </CcToolArgs>
                  </HeadlineCluster>
                </CcToolHeadline>
              </CcToolHeadlineButton>
            ) : null}
          </CcToolMain>
        </CcToolHeadlineRow>

        {showBody ? (
          inThinkRound ? (
            <ThinkBodyInRound>
              <Body
                id={bodyId}
                data-testid="agent-think-content"
                $nested={nested}
              >
                {markdown ? (
                  <AgentMarkdown text={text} variant="think" />
                ) : (
                  text.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)
                )}
                {showCursor || (isThinking && orchestrationActive) ? (
                  <StreamCursor aria-hidden />
                ) : null}
              </Body>
            </ThinkBodyInRound>
          ) : (
            <CcToolBranch>
              <CcBranchGlyph aria-hidden />
              <CcBranchContent>
                <Body
                  id={bodyId}
                  data-testid="agent-think-content"
                  $nested={nested}
                >
                  {markdown ? (
                    <AgentMarkdown text={text} variant="think" />
                  ) : (
                    text.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)
                  )}
                  {showCursor ? <StreamCursor aria-hidden /> : null}
                </Body>
              </CcBranchContent>
            </CcToolBranch>
          )
        ) : null}
      </CcToolRowWrap>
    </Root>
  )
}

const Root = styled.div<{ $nested?: boolean }>`
  width: 100%;
  opacity: ${({ $nested }) => ($nested ? 0.92 : 1)};
`

const Body = styled.div<{ $nested?: boolean }>`
  font-size: ${({ $nested }) => ($nested ? '0.78rem' : '0.82rem')};
  line-height: 1.55;
  color: ${editorTheme.textSecondary};

  p {
    margin: 0 0 0.35rem;
  }

  p:last-child {
    margin-bottom: 0;
  }
`

const StreamCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 0.95em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: ${editorTheme.accent};
  animation: blink 1s step-end infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`
