import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { CrewFailureReportPayload } from '@/types/crew'
import { AgentMarkdown } from './AgentMarkdown'
import { EditorButton } from '../ui/EditorButton'

export interface CrewFailureReportProps {
  report: CrewFailureReportPayload
  onOpenReviewerTimeline?: (childRunId: string) => void
  className?: string
}

function verdictLabelKey(verdict: CrewFailureReportPayload['verdict']): string {
  if (verdict === 'FAIL') return 'block'
  if (verdict === 'WARN') return 'warn'
  return 'pass'
}

function verdictClass(verdict: CrewFailureReportPayload['verdict']): string {
  if (verdict === 'PASS') return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-800'
  if (verdict === 'WARN') return 'border-amber-500/40 bg-amber-500/5 text-amber-900'
  return 'border-destructive/40 bg-destructive/5 text-destructive'
}

export function CrewFailureReport({
  report,
  onOpenReviewerTimeline,
  className,
}: CrewFailureReportProps) {
  const { t } = useTranslation(['editor'])

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-sm',
        verdictClass(report.verdict),
        className,
      )}
      data-testid="crew-failure-report"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide">
          {t(`editor:crew.failure.verdict.${verdictLabelKey(report.verdict)}`)}
        </span>
        {report.reviewerChildRunId && onOpenReviewerTimeline ? (
          <EditorButton
            variant="tool"
            size="sm"
            type="button"
            onClick={() => onOpenReviewerTimeline(report.reviewerChildRunId!)}
          >
            {t('editor:crew.failure.openReviewer')}
          </EditorButton>
        ) : null}
      </div>

      {report.issues && report.issues.length > 0 ? (
        <ul className="mb-2 list-none space-y-1 p-0">
          {report.issues.map((issue, i) => (
            <li key={`${issue.severity}-${i}`} className="text-xs leading-relaxed">
              <span className="font-semibold">{issue.severity}</span>
              <span className="mx-1">·</span>
              <span>{issue.message}</span>
              {issue.detail ? (
                <div className="mt-0.5 text-muted-foreground">{issue.detail}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {report.reportMarkdown?.trim() ? (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <AgentMarkdown text={report.reportMarkdown} variant="chat" />
        </div>
      ) : null}
    </div>
  )
}
