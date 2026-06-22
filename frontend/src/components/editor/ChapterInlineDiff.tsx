import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { EditorButton } from '../ui/EditorButton'
import { diffLines, isSameText, summarizeDiff } from '../../utils/textDiff'
import { cn } from '@/lib/utils'

export interface ChapterInlineDiffProps {
  baseline: string
  current: string
  title?: string
  acceptLabel?: string
  onAccept: () => void
  onDismiss: () => void
}

function diffLineClass(type: 'equal' | 'insert' | 'delete') {
  switch (type) {
    case 'insert':
      return 'bg-emerald-500/10 text-foreground'
    case 'delete':
      return 'bg-red-500/10 text-muted-foreground line-through'
    default:
      return 'bg-transparent text-foreground'
  }
}

export function ChapterInlineDiff({
  baseline,
  current,
  title,
  acceptLabel,
  onAccept,
  onDismiss,
}: ChapterInlineDiffProps) {
  const { t } = useTranslation(['editor'])
  const same = isSameText(baseline, current)
  const diff = useMemo(() => diffLines(baseline, current), [baseline, current])
  const stats = useMemo(() => summarizeDiff(diff), [diff])

  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2">
        <span className="text-[13px] font-semibold text-muted-foreground">{title || t('editor:diff.title')}</span>
        <div className="flex gap-2">
          <EditorButton variant="secondary" size="sm" type="button" onClick={onDismiss}>
            {t('editor:diff.close')}
          </EditorButton>
          <EditorButton variant="primary" size="sm" type="button" onClick={onAccept}>
            {acceptLabel || t('editor:diff.accept')}
          </EditorButton>
        </div>
      </div>
      {same ? (
        <div className="py-8 text-center text-[15px] text-muted-foreground">{t('editor:diff.same')}</div>
      ) : (
        <>
          <div className="text-[13px] text-muted-foreground/80">
            {t('editor:diff.stats', { insert: stats.insert, delete: stats.delete, equal: stats.equal })}
          </div>
          <div className="flex-1 whitespace-pre-wrap break-words font-mono text-[0.9rem] leading-[1.72]">
            {diff.map((line, index) => (
              <div
                key={`${line.type}-${index}`}
                className={cn('flex gap-2 border-l-2 px-1.5 py-0.5', diffLineClass(line.type))}
              >
                <span className="w-4 shrink-0 select-none font-mono text-[13px] opacity-55">
                  {line.type === 'insert' ? '+' : line.type === 'delete' ? '−' : ' '}
                </span>
                <span className="flex-1">{line.text || ' '}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
