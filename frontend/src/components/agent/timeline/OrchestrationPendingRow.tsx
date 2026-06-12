import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CC_TOOL_MAIN,
  CC_TOOL_ROW_WRAP,
  ORCHESTRATION_PENDING_LABEL,
  PLANNING_HEADLINE_ROW,
  TIMELINE_PENDING_IN,
} from '@/lib/timelineClasses'

/** CC-style idle row until the first visible tool row replaces this slot. */
export function OrchestrationPendingRow() {
  return (
    <div className={TIMELINE_PENDING_IN}>
      <div className={CC_TOOL_ROW_WRAP} data-testid="timeline-orchestration-pending">
        <div className={PLANNING_HEADLINE_ROW}>
          <div className={CC_TOOL_MAIN}>
            <div className={ORCHESTRATION_PENDING_LABEL}>
              <ShimmerScanText active>思考中…</ShimmerScanText>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
