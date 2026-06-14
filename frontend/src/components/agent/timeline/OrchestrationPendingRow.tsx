import { useTranslation } from 'react-i18next'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { translateOrchestrationHeadline } from '../../../utils/orchestrationI18n'
import {
  CC_TOOL_MAIN,
  CC_TOOL_ROW_WRAP,
  ORCHESTRATION_PENDING_LABEL,
  PLANNING_HEADLINE_ROW,
  TIMELINE_PENDING_IN,
} from '@/lib/timelineClasses'

/** CC-style idle row until the first visible tool row replaces this slot. */
export function OrchestrationPendingRow() {
  const { t } = useTranslation(['editor'])
  return (
    <div className={TIMELINE_PENDING_IN}>
      <div className={CC_TOOL_ROW_WRAP} data-testid="timeline-orchestration-pending">
        <div className={PLANNING_HEADLINE_ROW}>
          <div className={CC_TOOL_MAIN}>
            <div className={ORCHESTRATION_PENDING_LABEL}>
              <ShimmerScanText active>{translateOrchestrationHeadline(t('editor:timeline.thinkingActive'))}</ShimmerScanText>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
