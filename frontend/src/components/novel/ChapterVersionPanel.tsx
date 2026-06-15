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
  CHAPTER_VERSION_HINT,
  CHAPTER_VERSION_ITEM,
  CHAPTER_VERSION_META,
  CHAPTER_VERSION_PANEL,
  CHAPTER_VERSION_TIMELINE,
  CHAPTER_VERSION_TITLE,
  chapterVersionChevronClass,
} from '@/lib/chapterVersionClasses'
import i18n from '@/i18n'

interface ChapterVersionPanelProps {
  chapterId: string | null
  currentTitle: string
  currentContent: string
  expanded: boolean
  onToggle: () => void
  onRestored: () => void
  previewVersionId: string | null
  onPreviewVersion: (version: ChapterVersion | null) => void
}

export const ChapterVersionPanel: React.FC<ChapterVersionPanelProps> = ({
  chapterId,
  expanded,
  onToggle,
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
    if (!chapterId || !expanded) {
      return
    }
    onPreviewVersion(null)
    void loadVersions(chapterId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear preview only when chapter/panel changes
  }, [chapterId, expanded, loadVersions])

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
      <EditorButton variant="panel" type="button" onClick={onToggle}>
        <span>{t('editor:versions.title')}</span>
        <span className={chapterVersionChevronClass(expanded)}>▾</span>
      </EditorButton>
      {expanded && (
        <>
          {!chapterId ? (
            <div className={CHAPTER_VERSION_HINT}>{t('editor:versions.selectChapter')}</div>
          ) : loading ? (
            <PanelLoadingSkeleton rows={3} />
          ) : versions.length === 0 ? (
            <div className={CHAPTER_VERSION_HINT}>{t('editor:versions.empty')}</div>
          ) : (
            <div className={CHAPTER_VERSION_TIMELINE}>
              {versions.map((v) => (
                <div key={v.id} className={CHAPTER_VERSION_ITEM}>
                  <div className={CHAPTER_VERSION_BODY}>
                    <div className={CHAPTER_VERSION_META}>
                      <span className="time">
                        {new Date(v.createdAt).toLocaleString(dateLocale)}
                      </span>
                      <span className="badge">{sourceLabel(v.source)}</span>
                      <span className="words">
                        {t('editor:versions.wordCount', { count: v.wordCount })}
                      </span>
                    </div>
                    <div className={CHAPTER_VERSION_TITLE}>{v.title}</div>
                    <div className={CHAPTER_VERSION_ACTIONS}>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
