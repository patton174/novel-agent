import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/authApi'
import { CreateNovelModal } from '../components/novel/CreateNovelModal'
import { StoryMemoryModal } from '../components/memory/StoryMemoryModal'
import { EditorPageWrapper, EditorMainContainer } from '../components/editor/EditorPageLayout'
import { EditorSidebarDesktop } from '../components/editor/EditorSidebarDesktop'
import { EditorMobileNav } from '../components/editor/EditorMobileNav'
import type { EditorSidebarCommonProps } from '../components/editor/editorSidebarTypes'
import { EditorMobileTabBar } from '../components/editor/EditorMobileTabBar'
import { EditorCenterTabs } from '../components/editor/EditorCenterTabs'
import type { EditorSidebarTab } from '../components/editor/EditorCenterTabs.types'
import { EditorChatPanel } from '../components/editor/EditorChatPanel'
import { EditorStoryPanel } from '../components/editor/EditorStoryPanel'
import { EditorProfilePanel } from '../components/editor/EditorProfilePanel'
import { EditorSettingsModal } from '../components/editor/EditorSettingsModal'
import { EditorUserModal } from '../components/editor/EditorUserModal'
import { PixelAvatarModal } from '../components/avatars/PixelAvatarModal'
import { syncPixelAvatarForUser } from '../stores/pixelAvatarStore'
import { MotionPane } from '../components/motion/MotionPane'
import { useEditorPage } from '../hooks/editor/useEditorPage'
import { copyToClipboard } from '../utils/copyToClipboard'
import { appToast } from '../stores/appToastStore'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { editorLayout } from '@/styles/theme'
import { cn } from '@/lib/utils'

import { useTranslation } from 'react-i18next'

const EditorPage: React.FC = () => {
  const { t } = useTranslation(['editor'])
  const navigate = useNavigate()
  const editor = useEditorPage()
  const isMobile = useAppMobile()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const sidebarCenterTab: EditorSidebarTab =
    editor.activeCenterTab === 'story'
      ? 'story'
      : editor.activeCenterTab === 'mine'
        ? 'mine'
        : 'chat'

  const mobileHeaderTitle = useMemo(() => {
    if (editor.activeCenterTab === 'mine') {
      return t('editor:tabs.mine')
    }
    if (editor.activeCenterTab === 'story') {
      return t('editor:tabs.story')
    }
    return t('editor:tabs.chat')
  }, [editor.activeCenterTab, t])

  const mobileHeaderDescription = undefined

  const mobileTabBarInset = isMobile && !mobileSidebarOpen ? editorLayout.mobileTabBarHeightPx : 0

  const sidebarProps: EditorSidebarCommonProps = {
    centerTab: sidebarCenterTab,
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

  const handleMobileTabChange = (tab: typeof editor.activeCenterTab) => {
    setMobileSidebarOpen(false)
    editor.setActiveCenterTab(tab)
  }

  return (
    <EditorPageWrapper>
      <CreateNovelModal
        open={editor.showCreateNovel}
        onClose={() => editor.setShowCreateNovel(false)}
        onSubmit={async (payload) => { await editor.createNovel(payload) }}
      />

      {!isMobile ? <EditorSidebarDesktop {...sidebarProps} /> : null}

      <EditorMainContainer
        className={cn(isMobile && !mobileSidebarOpen && 'max-md:pb-16')}
      >
        <EditorMobileNav
          {...sidebarProps}
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
          activeTab={editor.activeCenterTab}
          headerTitle={mobileHeaderTitle}
          headerDescription={mobileHeaderDescription}
        />
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
            modelOverride={editor.modelOverride}
            onModelOverrideChange={editor.handleModelOverrideChange}
            onStreamPause={editor.stream.handleStreamPause}
            onStreamResume={editor.stream.handleStreamResumeForMessage}
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
            mobileBottomInset={mobileTabBarInset}
            referencedBooks={editor.stream.referencedBooks}
            onReferencedBooksChange={editor.stream.setReferencedBooks}
          />
        ) : editor.activeCenterTab === 'story' ? (
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
            mobileBottomInset={mobileTabBarInset}
          />
        ) : (
          <EditorProfilePanel
            onOpenAvatarEditor={() => setAvatarModalOpen(true)}
            hostModeEnabled={editor.hostModeEnabled}
            onHostModeChange={editor.handleHostModeChange}
            mobileBottomInset={mobileTabBarInset}
          />
        )}
        </MotionPane>

        <EditorMobileTabBar
          activeTab={editor.activeCenterTab}
          onTabChange={handleMobileTabChange}
          hidden={mobileSidebarOpen}
        />
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
        loading={editor.memory.memoryLoading}
        loadError={editor.memory.memoryLoadError}
        loadDetail={editor.memory.memoryLoadDetail}
        onRetry={() => editor.memory.refreshStoryMemory()}
        onLoadNodeDetail={editor.memory.loadMemoryNodeDetail}
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
