import { useTranslation } from 'react-i18next'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { TimelineToolRowShell } from './layout'
import { EDITOR_PIXEL_TOOL_ROW } from '@/lib/editorPixelClasses'
import { ORCH_HEADLINE } from '@/lib/timelineClasses'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'

/** CC-style idle row until the first visible tool row replaces this slot. */
export function OrchestrationPendingRow({ alignToGutter = false }: { alignToGutter?: boolean } = {}) {
  const { t } = useTranslation(['editor'])
  const title = t('editor:timeline.orchestrationActive')
  return (
    <TimelineToolRowShell
      testId="timeline-orchestration-pending"
      className={alignToGutter ? 'agent-timeline-pending-gutter' : undefined}
      leadIcon={
        <TimelineLeadIcon
          iconName="reasoning"
          status={resolveToolVisualStatus({ loading: true })}
        />
      }
      headline={
        <div className={EDITOR_PIXEL_TOOL_ROW} data-timeline-tool-title-row>
          <span className={ORCH_HEADLINE}>
            <ShimmerScanText active>{title}</ShimmerScanText>
          </span>
        </div>
      }
    />
  )
}
