import styled from 'styled-components'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CcToolMain,
  CcToolRowWrap,
  OrchestrationPendingLabel,
  PlanningHeadlineRow,
} from './timelineStyles'

const PendingWrap = styled.div`
  animation: orchestrationPendingIn 0.22s ease-out;

  @keyframes orchestrationPendingIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

/** CC-style idle row until the first visible tool row replaces this slot. */
export function OrchestrationPendingRow() {
  return (
    <PendingWrap>
      <CcToolRowWrap data-testid="timeline-orchestration-pending">
        <PlanningHeadlineRow>
          <CcToolMain>
            <OrchestrationPendingLabel>
              <ShimmerScanText active>思考中…</ShimmerScanText>
            </OrchestrationPendingLabel>
          </CcToolMain>
        </PlanningHeadlineRow>
      </CcToolRowWrap>
    </PendingWrap>
  )
}
