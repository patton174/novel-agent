import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorButton } from '../ui/EditorButton'
import { api } from '../../utils/api'
import type { ChapterVersion } from '../../types/novel'
import { confirmAction } from '../../stores/appDialog'
import { PanelLoadingSkeleton } from '@/components/loading/PageSkeletons'
import {
  CHAPTER_VERSION_ACTIONS,
  CHAPTER_VERSION_BODY,
  CHAPTER_VERSION_CONNECTOR,
  CHAPTER_VERSION_HEADING,
  CHAPTER_VERSION_HINT,
  CHAPTER_VERSION_ITEM,
  CHAPTER_VERSION_META,
  CHAPTER_VERSION_PANEL,
  CHAPTER_VERSION_RAIL,
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
  showConnector,
  meta,
  title,
  actions,
}: {
  current?: boolean
  active?: boolean
  showConnector?: boolean
  meta: React.ReactNode
  title: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className={CHAPTER_VERSION_ITEM}>
      <div className={CHAPTER_VERSION_RAIL}>
        <span className={chapterVersionDotClass({ current, active })} aria-hidden />
        {showConnector ? <span className={CHAPTER_VERSION_CONNECTOR} aria-hidden /> : null}
      </div>
      <div className={CHAPTER_VERSION_BODY}>
        <div className={CHAPTER_VERSION_META}>{meta}</div>
        <div className={CHAPTER_VERSION_TITLE}>{title}</div>
        {actions ? <div className={CHAPTER_VERSION_ACTIONS}>{actions}</div> : null}
      </div>
    </div>
  )
}

export const ChapterVersionPanel: React.FC<ChapterVersionPanelProps> = ({
  chapterId,
  currentTitle,
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
            showConnector={versions.length > 0}
            meta={<span className="time">{t('editor:versions.currentDraft')}</span>}
            title={currentTitle || t('editor:versions.untitled')}
          />

          {versions.length === 0 ? (
            <div className={CHAPTER_VERSION_HINT}>{t('editor:versions.empty')}</div>
          ) : (
            versions.map((v, index) => (
              <VersionTimelineRow
                key={v.id}
                active={previewVersionId === v.id}
                showConnector={index < versions.length - 1}
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
                title={v.title}
                actions={
                  <>
                    <EditorButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      active={previewVersionId === v.id}
                      onClick={() =>
                        onPreviewVersion(previewVersionId === v.id ? null : v)
                      }
                    >
                      {previewVersionId === v.id
                        ? t('editor:versions.closePreview')
                        : t('editor:versions.preview')}
                    </EditorButton>
                    <EditorButton
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={restoringId === v.id}
                      onClick={() => void handleRestore(v.id)}
                    >
                      {restoringId === v.id
                        ? t('editor:versions.restoring')
                        : t('editor:versions.restore')}
                    </EditorButton>
                  </>
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
