import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import { api } from '../../utils/api'
import type { ChapterVersion } from '../../types/novel'
import { confirmAction } from '../../stores/confirmDialogStore'
import { InlineBrandLoader } from '../loading/BrandLoader'

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
    <Panel>
      <EditorButton variant="panel" type="button" onClick={onToggle}>
        <span>版本历史</span>
        <ChevronWrap $open={expanded}>▾</ChevronWrap>
      </EditorButton>
      {expanded && (
        <>
          {!chapterId ? (
            <Hint>选择章节后可查看版本</Hint>
          ) : loading ? (
            <Hint>
              <InlineBrandLoader label="加载版本历史" />
            </Hint>
          ) : versions.length === 0 ? (
            <Hint>暂无历史版本</Hint>
          ) : (
            <VersionList>
              {versions.map((v) => (
                <VersionItem key={v.id}>
                  <VersionMeta>
                    <span className="time">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                    <span className="badge">{SOURCE_LABEL[v.source] ?? v.source}</span>
                    <span className="words">{v.wordCount} 字</span>
                  </VersionMeta>
                  <VersionTitle>{v.title}</VersionTitle>
                  <ActionRow>
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
                  </ActionRow>
                </VersionItem>
              ))}
            </VersionList>
          )}
        </>
      )}
    </Panel>
  )
}

const Panel = styled.div`
  margin-top: 0.85rem;
  padding: 0.65rem;
  border-radius: 10px;
  background: ${palette.surfaceGlassPanel};
  border: 1px solid ${palette.border};
`

const ChevronWrap = styled.span<{ $open: boolean }>`
  display: inline-block;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0')});
  transition: transform 0.2s ease;
  color: ${palette.textFaint};
`

const Hint = styled.div`
  font-size: 0.78rem;
  color: ${palette.textFaint};
  padding: 0.5rem 0.15rem;
  line-height: 1.5;
`

const VersionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 360px;
  overflow-y: auto;
  margin-top: 0.35rem;
`

const VersionItem = styled.div`
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  background: ${palette.bg};
  border: 1px solid ${palette.border};
`

const VersionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  align-items: center;
  font-size: 0.68rem;
  color: ${palette.textMuted};

  .badge {
    background: ${palette.accent};
    color: ${palette.text};
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-weight: 600;
  }
`

const VersionTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${palette.inkHover};
  margin: 0.25rem 0 0.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.4rem;
`
