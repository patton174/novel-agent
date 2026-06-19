import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/authApi'
import { CreateNovelModal } from '../components/novel/CreateNovelModal'
import { StoryMemoryModal } from '../components/memory/StoryMemoryModal'
import { EditorPageWrapper, EditorMainContainer } from '../components/editor/EditorPageLayout'
import { EditorSidebar, type EditorSidebarProps } from '../components/editor/EditorSidebar'
import { EditorMobileNav } from '../components/editor/EditorMobileNav'
import { EditorCenterTabs } from '../components/editor/EditorCenterTabs'
import { EditorChatPanel } from '../components/editor/EditorChatPanel'
import { EditorStoryPanel } from '../components/editor/EditorStoryPanel'
import { EditorSettingsModal } from '../components/editor/EditorSettingsModal'
import { EditorUserModal } from '../components/editor/EditorUserModal'
import { PixelAvatarModal } from '../components/avatars/PixelAvatarModal'
import { syncPixelAvatarForUser } from '../stores/pixelAvatarStore'
import { MotionPane } from '../components/motion/MotionPane'
import { useEditorPage } from '../hooks/editor/useEditorPage'
import { copyToClipboard } from '../utils/copyToClipboard'
import { appToast } from '../stores/appToastStore'

import { useTranslation } from 'react-i18next'

const EditorPage: React.FC = () => {
  const { t } = useTranslation(['editor'])
  const navigate = useNavigate()
  const editor = useEditorPage()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const sidebarProps: EditorSidebarProps = {
    centerTab: editor.activeCenterTab,
    activeNovelId: editor.activeNovelId,
    activeSession: editor.sessions.activeSession,
    runningSessionId: editor.stream.isLoading ? editor.sessions.activeSession : null,
    novelSessionGroups: editor.sessions.novelSessionGroups,
    expandedNovelIds: editor.sessions.expandedNovelIds,
    titlePendingSessionIds: editor.sessions.titlePendingSessionIds,
    onToggleNovelExpanded: editor.sessions.toggleNovelExpanded,
    onSelectNovel: (id) => {
      editor.sessions.expandNovel(id)
      void editor.selectNovel(id)
    },
    onNewChatForNovel: (novelId) => {
      if (novelId !== editor.activeNovelId) {
        void editor.selectNovel(novelId).then(() => editor.sessions.handleNewChat())
      } else {
        editor.sessions.handleNewChat()
      }
    },
    onDeleteNovel: editor.sessions.performDeleteNovel,
    onUpdateNovel: async (novelId, payload) => {
      await editor.updateNovel(novelId, payload)
    },
    onNewNovel: () => editor.setShowCreateNovel(true),
    onSwitchSession: editor.sessions.switchSession,
    onRenameSession: editor.sessions.handleRenameSession,
    onDeleteSession: editor.sessions.handleDeleteSession,
    onOpenMemory: () => editor.memory.openMemoryModal(),
    onOpenSettings: () => setSettingsOpen(true),
    onOpenUserProfile: () => setUserModalOpen(true),
    onOpenAvatarEditor: () => setAvatarModalOpen(true),
    memoryModalOpen: editor.memory.memoryModalOpen,
    memoryTabs: editor.memory.memoryTabs,
    storySection: {
      hasNovel: Boolean(editor.activeNovel),
      reindexing: editor.reindex.reindexing,
      reindexProgress: editor.reindex.reindexProgress,
      onReindex: () => void editor.reindex.handleReindexNovel(),
      activeChapterId: editor.activeChapterId,
      activeChapterTitle: editor.activeChapter?.title ?? '',
      chapterContent: editor.chapterContent,
      onChapterRestored: () => void editor.refreshActiveChapter(),
      versionPreview: editor.versionPreview,
      onVersionPreviewChange: editor.setVersionPreview,
    },
  }

  return (
    <EditorPageWrapper>
      <CreateNovelModal
        open={editor.showCreateNovel}
        onClose={() => editor.setShowCreateNovel(false)}
        onSubmit={async (payload) => { await editor.createNovel(payload) }}
      />

      <EditorSidebar {...sidebarProps} />

      <EditorMainContainer>
        <EditorMobileNav {...sidebarProps} />
        <EditorCenterTabs
          activeTab={editor.activeCenterTab}
          onTabChange={editor.setActiveCenterTab}
        />

        <MotionPane paneKey={editor.activeCenterTab} className="flex-1">
        {editor.activeCenterTab === 'chat' ? (
          <EditorChatPanel
            sessionTitle={editor.sessions.activeSessionTitle}
            activeNovel={editor.activeNovel}
            messages={editor.messages}
            inputValue={editor.inputValue}
            onInputChange={editor.setInputValue}
            onSend={() => void editor.stream.handleSend()}
            isLoading={editor.stream.isLoading}
            hostModeEnabled={editor.hostModeEnabled}
            onHostModeChange={editor.handleHostModeChange}
            onStreamAbort={editor.stream.handleStreamAbort}
            hostBannerText={editor.hostBannerText}
            hostBannerRecovering={editor.stream.isSseRecovering}
            activeStreamMessageId={editor.stream.activeStreamMessageId}
            thinkPanelOpen={editor.stream.thinkPanelOpen}
            onThinkPanelChange={(id, open) =>
              editor.stream.setThinkPanelOpen((prev) => ({ ...prev, [id]: open }))
            }
            onSelectChoice={editor.stream.handleChoiceSelect}
            onSubmitInteraction={editor.stream.handleInteractionSubmit}
            messagesAreaRef={editor.scroll.messagesAreaRef}
            messagesEndRef={editor.scroll.messagesEndRef}
            onEditUserMessage={editor.setInputValue}
            contextUsage={editor.stream.composerContextUsage}
            spinnerMode={editor.stream.composerSpinnerMode}
          />
        ) : (
          <EditorStoryPanel
            outlineCollapsed={editor.storyOutlineCollapsed}
            onOutlineCollapsedChange={editor.setStoryOutlineCollapsed}
            reindexing={editor.reindex.reindexing}
            reindexProgress={editor.reindex.reindexProgress}
            onReindex={() => void editor.reindex.handleReindexNovel()}
            activeChapterId={editor.activeChapterId}
            activeChapterTitle={editor.activeChapter?.title ?? ''}
            chapterContent={editor.chapterContent}
            onChapterRestored={() => void editor.refreshActiveChapter()}
            toolbarTitle={
              editor.agentChapterStreamTitle ||
              editor.activeChapter?.title ||
              editor.activeNovel?.title ||
              t('editor:page.defaultChapterTitle')
            }
            chapterDirty={editor.chapterDirty}
            onCopyChapter={() => void copyToClipboard(editor.chapterContent, t('editor:page.chapterCopied'))}
            onSaveChapter={() => {
              void editor
                .saveActiveChapter()
                .then(() => appToast.success(t('editor:page.chapterSaved')))
                .catch(() => appToast.error(t('editor:page.chapterSaveFail')))
            }}
            canSave={Boolean(editor.activeChapterId && editor.chapterDirty)}
            hasNovel={Boolean(editor.activeNovel)}
            hasChapter={Boolean(editor.activeChapterId) || editor.agentChapterStreaming}
            agentChapterStreaming={editor.agentChapterStreaming}
            agentChapterStreamPhase={editor.agentChapterStreamPhase}
            agentChapterStreamCharCount={editor.chapterContent.length}
            agentChapterStreamTitle={editor.agentChapterStreamTitle}
            onChapterContentChange={editor.updateChapterContent}
            versionPreview={editor.versionPreview}
            onVersionPreviewChange={editor.setVersionPreview}
            chapterDiffActive={editor.chapterDiffActive}
            chapterDiffBaseline={editor.chapterDiffBaseline}
            onAcceptChapterDiff={editor.acceptChapterDiff}
            onDismissChapterDiff={editor.dismissChapterDiff}
          />
        )}
        </MotionPane>
      </EditorMainContainer>

      <StoryMemoryModal
        open={editor.memory.memoryModalOpen}
        onClose={() => editor.memory.setMemoryModalOpen(false)}
        memoryTabs={editor.memory.memoryTabs}
        memoryTrees={editor.memory.memoryTreeIndex}
        memoryNodesByScope={editor.memory.memoryNodesByScope}
        activeScope={editor.memory.activeScope}
        onScopeChange={editor.memory.setActiveScope}
        updatedAt={editor.memory.memoryUpdatedAt}
      />

      <EditorSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        hostModeEnabled={editor.hostModeEnabled}
        onHostModeChange={editor.handleHostModeChange}
      />

      <EditorUserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onOpenAvatarEditor={() => setAvatarModalOpen(true)}
        onLogout={() => {
          void logout().finally(() => {
            syncPixelAvatarForUser(null)
            setUserModalOpen(false)
            navigate('/login')
          })
        }}
      />

      <PixelAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </EditorPageWrapper>
  )
}

export default EditorPage
