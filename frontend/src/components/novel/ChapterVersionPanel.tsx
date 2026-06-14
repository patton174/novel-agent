import React, { useCallback, useEffect, useState } from 'react'
import { EditorButton } from '../ui/EditorButton'
import { api } from '../../utils/api'
import type { ChapterVersion } from '../../types/novel'
import { confirmAction } from '../../stores/appDialog'
import { PanelLoadingSkeleton } from '@/components/loading/PageSkeletons'
import {
  CHAPTER_VERSION_ACTIONS,
  CHAPTER_VERSION_HINT,
  CHAPTER_VERSION_ITEM,
  CHAPTER_VERSION_LIST,
  CHAPTER_VERSION_META,
  CHAPTER_VERSION_PANEL,
  CHAPTER_VERSION_TITLE,
  chapterVersionChevronClass,
} from '@/lib/chapterVersionClasses'

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

const SOURCE_LABEL: Record<string, string> = {
  user: '手动',
  ai: 'AI',
  restore: '恢复',
}

export const ChapterVersionPanel: React.FC<ChapterVersionPanelProps> = ({
  chapterId,
  expanded,
  onToggle,
  onRestored,
  previewVersionId,
  onPreviewVersion,
}) => {
  const [versions, setVersions] = useState<ChapterVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

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
      title: '恢复版本',
      description: '确定恢复到该版本？当前正文会先保存为一个版本。',
      confirmLabel: '恢复',
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
        <span>版本历史</span>
        <span className={chapterVersionChevronClass(expanded)}>▾</span>
      </EditorButton>
      {expanded && (
        <>
          {!chapterId ? (
            <div className={CHAPTER_VERSION_HINT}>选择章节后可查看版本</div>
          ) : loading ? (
            <PanelLoadingSkeleton rows={3} />
          ) : versions.length === 0 ? (
            <div className={CHAPTER_VERSION_HINT}>暂无历史版本</div>
          ) : (
            <div className={CHAPTER_VERSION_LIST}>
              {versions.map((v) => (
                <div key={v.id} className={CHAPTER_VERSION_ITEM}>
                  <div className={CHAPTER_VERSION_META}>
                    <span className="time">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                    <span className="badge">{SOURCE_LABEL[v.source] ?? v.source}</span>
                    <span className="words">{v.wordCount} 字</span>
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
                      {previewVersionId === v.id ? '关闭预览' : '正文预览'}
                    </EditorButton>
                    <EditorButton
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={restoringId === v.id}
                      onClick={() => void handleRestore(v.id)}
                    >
                      {restoringId === v.id ? '恢复中…' : '恢复'}
                    </EditorButton>
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
