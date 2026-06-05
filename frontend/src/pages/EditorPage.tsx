import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/authApi'
import { CreateNovelModal } from '../components/novel/CreateNovelModal'
import { StoryMemoryModal } from '../components/memory/StoryMemoryModal'
import { EditorPageWrapper, EditorMainContainer } from '../components/editor/EditorPageLayout'
import { EditorSidebar } from '../components/editor/EditorSidebar'
import { EditorCenterTabs } from '../components/editor/EditorCenterTabs'
import { EditorChatPanel } from '../components/editor/EditorChatPanel'
import { EditorStoryPanel } from '../components/editor/EditorStoryPanel'
import { EditorSessionDialogs } from '../components/editor/EditorSessionDialogs'
import { EditorSettingsModal } from '../components/editor/EditorSettingsModal'
import { MotionPane } from '../components/motion/MotionPane'
import { useEditorPage } from '../hooks/editor/useEditorPage'
import { copyToClipboard } from '../utils/copyToClipboard'
import { appToast } from '../stores/appToastStore'

const EditorPage: React.FC = () => {
  const navigate = useNavigate()
  const editor = useEditorPage()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <EditorPageWrapper>
      <CreateNovelModal
        open={editor.showCreateNovel}
        onClose={() => editor.setShowCreateNovel(false)}
        onSubmit={async (payload) => { await editor.createNovel(payload) }}
      />

      <EditorSidebar
        sessionSearch={editor.sessions.sessionSearch}
        onSessionSearchChange={editor.sessions.setSessionSearch}
        activeNovelId={editor.activeNovelId}
        activeSession={editor.sessions.activeSession}
        novelSessionGroups={editor.sessions.novelSessionGroups}
        expandedNovelIds={editor.sessions.expandedNovelIds}
        batchMode={editor.sessions.batchMode}
        batchNovelId={editor.sessions.batchNovelId}
        selectedSessionIds={editor.sessions.selectedSessionIds}
        titlePendingSessionIds={editor.sessions.titlePendingSessionIds}
        onToggleNovelExpanded={editor.sessions.toggleNovelExpanded}
        onSelectNovel={(id) => {
          editor.sessions.expandNovel(id)
          void editor.selectNovel(id)
        }}
        onNewChatForNovel={(novelId) => {
          if (novelId !== editor.activeNovelId) {
            void editor.selectNovel(novelId).then(() => editor.sessions.handleNewChat())
          } else {
            editor.sessions.handleNewChat()
          }
        }}
        onStartBatchForNovel={(novelId) => {
          if (novelId !== editor.activeNovelId) {
            void editor.selectNovel(novelId).then(() =>
              editor.sessions.startBatchForNovel(novelId),
            )
          } else {
            editor.sessions.startBatchForNovel(novelId)
          }
        }}
        onExitBatchMode={editor.sessions.exitBatchMode}
        onBatchDeleteRequest={editor.sessions.requestBatchDelete}
        onSelectAllSessions={editor.sessions.selectAllSessionsInBatch}
        onDeleteNovelRequest={editor.sessions.handleDeleteNovelRequest}
        onToggleSessionSelected={editor.sessions.toggleSessionSelected}
        onNewNovel={() => editor.setShowCreateNovel(true)}
        onSwitchSession={editor.sessions.switchSession}
        onRenameSession={editor.sessions.handleRenameSession}
        onDeleteSession={editor.sessions.handleDeleteSession}
        onOpenMemory={() => editor.memory.openMemoryModal('world')}
        onOpenSettings={() => setSettingsOpen(true)}
        memoryModalOpen={editor.memory.memoryModalOpen}
      />

      <EditorMainContainer>
        <EditorCenterTabs
          activeTab={editor.activeCenterTab}
          onTabChange={editor.setActiveCenterTab}
        />

        <MotionPane paneKey={editor.activeCenterTab}>
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
            hostBannerRecovering={Boolean(editor.stream.liveStreamMessage?.agentHostGuardMessage)}
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
            versionsExpanded={editor.versionsExpanded}
            onVersionsToggle={() => editor.setVersionsExpanded((v) => !v)}
            onChapterRestored={() => void editor.refreshActiveChapter()}
            toolbarTitle={
              editor.agentChapterStreamTitle ||
              editor.activeChapter?.title ||
              editor.activeNovel?.title ||
              '章节编辑'
            }
            chapterDirty={editor.chapterDirty}
            onCopyChapter={() => void copyToClipboard(editor.chapterContent, '章节正文已复制')}
            onSaveChapter={() => {
              void editor
                .saveActiveChapter()
                .then(() => appToast.success('章节已保存'))
                .catch(() => appToast.error('章节保存失败'))
            }}
            canSave={Boolean(editor.activeChapterId && editor.chapterDirty)}
            hasNovel={Boolean(editor.activeNovel)}
            hasChapter={Boolean(editor.activeChapterId) || editor.agentChapterStreaming}
            agentChapterStreaming={editor.agentChapterStreaming}
            agentChapterStreamPhase={editor.agentChapterStreamPhase}
            agentChapterStreamCharCount={editor.chapterContent.length}
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
        memory={editor.memory.storyMemory}
        activeTab={editor.memory.memoryTab}
        onTabChange={editor.memory.setMemoryTab}
        updatedAt={editor.memory.memoryUpdatedAt}
      />

      <EditorSessionDialogs
        dialog={editor.sessions.sessionDialog}
        onClose={() => editor.sessions.setSessionDialog(null)}
        onConfirmRename={editor.sessions.confirmRenameSession}
        onConfirmDelete={editor.sessions.confirmDeleteSession}
        onConfirmBatchDelete={editor.sessions.confirmBatchDeleteSessions}
        onConfirmDeleteNovel={() => void editor.sessions.confirmDeleteNovel()}
      />

      <EditorSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        hostModeEnabled={editor.hostModeEnabled}
        onHostModeChange={editor.handleHostModeChange}
        onLogout={() => {
          void logout().finally(() => {
            setSettingsOpen(false)
            navigate('/login')
          })
        }}
      />
    </EditorPageWrapper>
  )
}

export default EditorPage
