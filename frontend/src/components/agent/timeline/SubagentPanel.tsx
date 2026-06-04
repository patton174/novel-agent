import { useId, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { deriveSubagentLiveLines } from '../../../utils/subagentActivity'
import { editorTheme } from '../../../styles/editorTheme'
import { palette, textStyle } from '../../../styles/theme'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { SubagentDetailModal } from './SubagentDetailModal'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'
import {
  CcBranchContent,
  CcBranchGlyph,
  CcToolArgs,
  CcToolBranch,
  CcToolHeadline,
  CcToolHeadlineButton,
  CcToolHeadlineRow,
  CcToolMain,
  CcToolName,
  CcToolRowWrap,
  HeadlineCluster,
  ToolLeadCell,
} from './timelineStyles'

const LIVE_MAX_LINES = 3

export function SubagentPanel({
  subagent,
  loading,
}: {
  subagent: AgentSubagentState
  loading: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const runActive = subagent.status === 'active' && loading
  const meta = deriveSubagentDisplayMeta(subagent, runActive)
  const toolStats = meta.toolStats
  const liveLines = deriveSubagentLiveLines(subagent, runActive)
  const liveText = liveLines.join('\n')
  const showLiveBody = runActive && liveText.trim().length > 0
  const bodyId = useId()
  const liveRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = liveRef.current
    if (!el || !showLiveBody) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [liveText, showLiveBody])

  const phaseLabel = runActive ? '运行中' : meta.statusLabel
  const iconStatus = resolveToolVisualStatus({
    loading: runActive,
    error: subagent.status === 'failed',
    success: subagent.status === 'done' && !runActive,
  })

  return (
    <>
      <Root data-testid="subagent-panel">
        <CcToolRowWrap>
          <CcToolHeadlineRow>
            <ToolLeadCell>
              <TimelineLeadIcon iconName="Agent" status={iconStatus} />
            </ToolLeadCell>
            <CcToolMain>
              <CcToolHeadlineButton
                type="button"
                onClick={() => setModalOpen(true)}
                aria-expanded={showLiveBody}
                aria-controls={showLiveBody ? bodyId : undefined}
                data-testid="subagent-inline-row"
              >
                <CcToolHeadline>
                  <HeadlineCluster>
                    <CcToolName>{meta.name}</CcToolName>
                    <CcToolArgs>
                      {runActive ? (
                        <ShimmerScanText active>{phaseLabel}</ShimmerScanText>
                      ) : (
                        phaseLabel
                      )}
                      {meta.turnHint ? ` · ${meta.turnHint}` : ''}
                      {toolStats ? (
                        <>
                          {' · '}
                          <ToolStats>{toolStats}</ToolStats>
                        </>
                      ) : null}
                    </CcToolArgs>
                  </HeadlineCluster>
                </CcToolHeadline>
              </CcToolHeadlineButton>
            </CcToolMain>
          </CcToolHeadlineRow>

          {showLiveBody ? (
            <CcToolBranch>
              <CcBranchGlyph aria-hidden />
              <CcBranchContent>
                <LiveBody id={bodyId} ref={liveRef} data-testid="subagent-live-body">
                  {liveLines.map((line, index) => (
                    <LiveLine key={`${index}:${line.slice(0, 24)}`}>
                      {index === liveLines.length - 1 && runActive ? (
                        <ShimmerScanText active>{line}</ShimmerScanText>
                      ) : (
                        line
                      )}
                    </LiveLine>
                  ))}
                </LiveBody>
              </CcBranchContent>
            </CcToolBranch>
          ) : null}
        </CcToolRowWrap>
      </Root>

      <SubagentDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subagent={subagent}
        loading={loading}
      />
    </>
  )
}

const Root = styled.div`
  width: 100%;
  margin: 0.04rem 0 0.1rem;
`

const ToolStats = styled.span`
  ${textStyle('micro')}
  font-weight: 400;
  color: ${editorTheme.textMuted};
  white-space: nowrap;
`

const LiveBody = styled.div`
  max-height: calc(0.82rem * 1.45 * ${LIVE_MAX_LINES});
  overflow: hidden auto;
  scroll-behavior: smooth;
  mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 100%);

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`

const LiveLine = styled.div`
  ${textStyle('uiSm')}
  line-height: 1.45;
  color: ${editorTheme.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
