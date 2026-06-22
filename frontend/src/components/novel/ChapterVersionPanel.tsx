import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EditorButton } from '../ui/EditorButton'
import { api } from '../../utils/api'
import type { ChapterVersion } from '../../types/novel'
import { confirmAction } from '../../stores/appDialog'
import { PanelLoadingSkeleton } from '@/components/loading/PageSkeletons'
import { cn } from '@/lib/utils'
import { chapterVersionExcerpt } from '../../utils/chapterVersionExcerpt'
import {
  CHAPTER_VERSION_ACTIONS,
  CHAPTER_VERSION_BODY,
  CHAPTER_VERSION_EXCERPT,
  CHAPTER_VERSION_HEADING,
  CHAPTER_VERSION_HEADER_ROW,
  CHAPTER_VERSION_HINT,
  CHAPTER_VERSION_ICON_BTN,
  CHAPTER_VERSION_INDENT,
  CHAPTER_VERSION_ITEM,
  CHAPTER_VERSION_META,
  CHAPTER_VERSION_PANEL,
  CHAPTER_VERSION_STEM_ABOVE,
  CHAPTER_VERSION_STEM_BELOW,
  CHAPTER_VERSION_TIMELINE,
  CHAPTER_VERSION_TITLE,
  chapterVersionDotClass,
} from '@/lib/chapterVersionClasses'
import i18n from '@/i18n'

interface ChapterVersionPanelProps {
  chapterId: string | null
  currentTitle: string
  currentContent: string
  onRestored: () => void
  previewVersionId: string | null
  onPreviewVersion: (version: ChapterVersion | null) => void
}

function VersionTimelineRow({
  current,
  active,
  connectorAbove,
  connectorBelow,
  meta,
  title,
  excerpt,
  actions,
}: {
  current?: boolean
  active?: boolean
  connectorAbove?: boolean
  connectorBelow?: boolean
  meta: React.ReactNode
  title: React.ReactNode
  excerpt?: string
  actions?: React.ReactNode
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const [dotCenterY, setDotCenterY] = useState<number | null>(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const measure = () => {
      setDotCenterY(header.offsetHeight / 2)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [title, actions, excerpt])

  const stemStyle =
    dotCenterY != null
      ? ({ '--version-dot-center-y': `${dotCenterY}px` } as React.CSSProperties)
      : undefined

  return (
    <div className={CHAPTER_VERSION_ITEM} style={stemStyle}>
      {connectorAbove && dotCenterY != null ? (
        <span className={CHAPTER_VERSION_STEM_ABOVE} aria-hidden />
      ) : null}
      {connectorBelow && dotCenterY != null ? (
        <span className={CHAPTER_VERSION_STEM_BELOW} aria-hidden />
      ) : null}
      <div className={CHAPTER_VERSION_BODY}>
        <div ref={headerRef} className={CHAPTER_VERSION_HEADER_ROW}>
          <span className={chapterVersionDotClass({ current, active })} aria-hidden />
          <div className={CHAPTER_VERSION_TITLE}>{title}</div>
          {actions ? <div className={CHAPTER_VERSION_ACTIONS}>{actions}</div> : null}
        </div>
        {excerpt ? (
          <div className={cn(CHAPTER_VERSION_INDENT, CHAPTER_VERSION_EXCERPT)}>{excerpt}</div>
        ) : null}
        {meta ? (
          <div className={cn(CHAPTER_VERSION_INDENT, CHAPTER_VERSION_META)}>{meta}</div>
        ) : null}
      </div>
    </div>
  )
}

export const ChapterVersionPanel: React.FC<ChapterVersionPanelProps> = ({
  chapterId,
  currentTitle,
  currentContent,
  onRestored,
  previewVersionId,
  onPreviewVersion,
}) => {
  const { t } = useTranslation(['editor'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const [versions, setVersions] = useState<ChapterVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const sourceLabel = (source: string) => {
    if (source === 'user') return t('editor:versions.sourceUser')
    if (source === 'ai') return t('editor:versions.sourceAi')
    if (source === 'restore') return t('editor:versions.sourceRestore')
    return source
  }

  const loadVersions = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const list = await api.listChapterVersions(id, 15)
      setVersions(list)
    } catch {
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!chapterId) {
      setVersions([])
      onPreviewVersion(null)
      return
    }
    onPreviewVersion(null)
    void loadVersions(chapterId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear preview only when chapter changes
  }, [chapterId, loadVersions])

  const handleRestore = async (versionId: string) => {
    if (!chapterId) return
    if (!(await confirmAction({
      title: t('editor:story.restoreVersionTitle'),
      description: t('editor:story.restoreVersionDesc'),
      confirmLabel: t('editor:story.restoreConfirm'),
    }))) return
    setRestoringId(versionId)
    try {
      await api.restoreChapterVersion(chapterId, versionId)
      onPreviewVersion(null)
      await loadVersions(chapterId)
      onRestored()
    } finally {
      setRestoringId(null)
    }
  }

  const currentExcerpt = chapterVersionExcerpt(currentContent)

  return (
    <div className={CHAPTER_VERSION_PANEL}>
      <div className={CHAPTER_VERSION_HEADING}>{t('editor:versions.title')}</div>
      {!chapterId ? (
        <div className={CHAPTER_VERSION_HINT}>{t('editor:versions.selectChapter')}</div>
      ) : loading ? (
        <PanelLoadingSkeleton rows={3} />
      ) : (
        <div className={CHAPTER_VERSION_TIMELINE}>
          <VersionTimelineRow
            current
            connectorBelow={versions.length > 0}
            title={currentTitle || t('editor:versions.untitled')}
            excerpt={currentExcerpt || undefined}
            meta={<span className="badge">{t('editor:versions.currentDraft')}</span>}
          />

          {versions.length === 0 ? (
            <div className={CHAPTER_VERSION_HINT}>{t('editor:versions.empty')}</div>
          ) : (
            versions.map((v, index) => {
              const previewActive = previewVersionId === v.id
              const excerpt = chapterVersionExcerpt(v.content)
              return (
                <VersionTimelineRow
                  key={v.id}
                  active={previewActive}
                  connectorAbove
                  connectorBelow={index < versions.length - 1}
                  title={v.title || t('editor:versions.untitled')}
                  excerpt={excerpt || undefined}
                  meta={
                    <>
                      <span className="time">
                        {new Date(v.createdAt).toLocaleString(dateLocale)}
                      </span>
                      <span className="badge">{sourceLabel(v.source)}</span>
                      <span className="words">
                        {t('editor:versions.wordCount', { count: v.wordCount })}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      <EditorButton
                        type="button"
                        variant="icon"
                        size="sm"
                        active={previewActive}
                        className={CHAPTER_VERSION_ICON_BTN}
                        title={
                          previewActive
                            ? t('editor:versions.closePreview')
                            : t('editor:versions.preview')
                        }
                        aria-label={
                          previewActive
                            ? t('editor:versions.closePreview')
                            : t('editor:versions.preview')
                        }
                        onClick={() => onPreviewVersion(previewActive ? null : v)}
                      >
                        {previewActive ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </EditorButton>
                      <EditorButton
                        type="button"
                        variant="icon"
                        size="sm"
                        disabled={restoringId === v.id}
                        className={CHAPTER_VERSION_ICON_BTN}
                        title={
                          restoringId === v.id
                            ? t('editor:versions.restoring')
                            : t('editor:versions.restore')
                        }
                        aria-label={
                          restoringId === v.id
                            ? t('editor:versions.restoring')
                            : t('editor:versions.restore')
                        }
                        onClick={() => void handleRestore(v.id)}
                      >
                        <RotateCcw className="size-3.5" />
                      </EditorButton>
                    </>
                  }
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
