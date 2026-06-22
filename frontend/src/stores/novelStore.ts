import { create } from 'zustand'
import { deleteSessions, listSessionsByNovel } from '../utils/chatSessionStore'
import { api } from '../utils/api'
import type { Chapter, ChapterSummary, CreateNovelPayload, Novel, Volume } from '../types/novel'
import type { ChapterReorderPlan } from '../utils/outlineDrag'

interface NovelStoreState {
  novels: Novel[]
  activeNovelId: string | null
  volumes: Volume[]
  chapters: ChapterSummary[]
  activeChapterId: string | null
  activeVolumeId: string | null
  chapterContent: string
  chapterDirty: boolean
  agentChapterStreaming: boolean
  agentChapterStreamTitle: string
  agentChapterStreamPhase: 'idle' | 'generating' | 'saving'
  chapterDiffBaseline: string | null
  chapterDiffActive: boolean
  loadingNovels: boolean
  loadingChapters: boolean
  loadNovels: () => Promise<void>
  selectNovel: (novelId: string) => Promise<void>
  createNovel: (payload: CreateNovelPayload) => Promise<Novel>
  updateNovel: (novelId: string, payload: Partial<CreateNovelPayload>) => Promise<Novel>
  deleteNovel: (novelId: string) => Promise<void>
  loadVolumes: (novelId: string) => Promise<void>
  loadChapters: (novelId: string, options?: { listOnly?: boolean }) => Promise<void>
  selectChapter: (chapterId: string, options?: { preserveDiff?: boolean }) => Promise<void>
  updateChapterContent: (content: string) => void
  saveActiveChapter: () => Promise<void>
  addVolume: (title: string) => Promise<Volume | null>
  addChapter: (title?: string, volumeId?: string) => Promise<Chapter | null>
  deleteChapter: (chapterId: string) => Promise<void>
  renameChapter: (chapterId: string, title: string) => Promise<void>
  reorderVolumes: (volumeIds: string[]) => Promise<void>
  applyChapterReorderPlans: (plans: ChapterReorderPlan[]) => Promise<void>
  refreshActiveChapter: () => Promise<void>
  reloadActiveChapterContent: () => Promise<void>
  beginAgentChapterStream: (payload: { title: string; chapterId?: string | null }) => void
  appendAgentChapterStream: (delta: string) => void
  markAgentChapterStreamSaving: () => void
  finishAgentChapterStream: () => void
  activateChapterDiffIfChanged: () => void
  dismissChapterDiff: () => void
  acceptChapterDiff: () => void
  snapshotChapterDiffBeforeAgent: () => void
  selectChapterAfterAgentWrite: (preferredTitle?: string) => Promise<void>
}

export const useNovelStore = create<NovelStoreState>((set, get) => ({
  novels: [],
  activeNovelId: null,
  volumes: [],
  chapters: [],
  activeChapterId: null,
  activeVolumeId: null,
  chapterContent: '',
  chapterDirty: false,
  agentChapterStreaming: false,
  agentChapterStreamTitle: '',
  agentChapterStreamPhase: 'idle',
  chapterDiffBaseline: null,
  chapterDiffActive: false,
  loadingNovels: false,
  loadingChapters: false,

  loadNovels: async () => {
    set({ loadingNovels: true })
    try {
      const novels = await api.listNovels()
      set({ novels })
      const { activeNovelId } = get()
      if (!activeNovelId && novels.length > 0) {
        await get().selectNovel(novels[0].id)
      }
    } finally {
      set({ loadingNovels: false })
    }
  },

  selectNovel: async (novelId: string) => {
    set({
      activeNovelId: novelId,
      activeChapterId: null,
      activeVolumeId: null,
      chapterContent: '',
      chapterDirty: false,
      volumes: [],
    })
    await get().loadVolumes(novelId)
    await get().loadChapters(novelId)
  },

  createNovel: async (payload: CreateNovelPayload) => {
    const novel = await api.createNovel(payload)
    set((state) => ({ novels: [novel, ...state.novels] }))
    await get().selectNovel(novel.id)
    return novel
  },

  updateNovel: async (novelId: string, payload: Partial<CreateNovelPayload>) => {
    const updated = await api.updateNovel(novelId, payload)
    set((state) => ({
      novels: state.novels.map((n) => (n.id === novelId ? updated : n)),
    }))
    return updated
  },

  deleteNovel: async (novelId: string) => {
    const result = await api.deleteNovel(novelId)
    if (result && result.ok === false) {
      throw new Error('delete novel failed')
    }
    const sessionIds = listSessionsByNovel(novelId).map((s) => s.id)
    if (sessionIds.length > 0) {
      deleteSessions(sessionIds)
    }
    const novels = get().novels.filter((n) => n.id !== novelId)
    const wasActive = get().activeNovelId === novelId
    set({
      novels,
      ...(wasActive
        ? {
            activeNovelId: null,
            activeChapterId: null,
            activeVolumeId: null,
            chapterContent: '',
            chapterDirty: false,
            volumes: [],
            chapters: [],
          }
        : {}),
    })
    if (wasActive && novels.length > 0) {
      await get().selectNovel(novels[0].id)
    }
  },

  loadVolumes: async (novelId: string) => {
    const volumes = await api.listVolumes(novelId)
    set({ volumes })
    const { activeVolumeId } = get()
    if (!activeVolumeId && volumes.length > 0) {
      set({ activeVolumeId: volumes[0].id })
    }
  },

  loadChapters: async (novelId: string, options?: { listOnly?: boolean }) => {
    set({ loadingChapters: true })
    try {
      const chapters = await api.listChapters(novelId)
      set({ chapters })
      if (options?.listOnly) {
        return
      }
      const { activeChapterId } = get()
      if (chapters.length === 0) {
        set({ activeChapterId: null, chapterContent: '', chapterDirty: false })
        return
      }
      const targetId =
        activeChapterId && chapters.some((c) => c.id === activeChapterId)
          ? activeChapterId
          : chapters[0].id
      await get().selectChapter(targetId)
    } finally {
      set({ loadingChapters: false })
    }
  },

  selectChapter: async (chapterId: string, options?: { preserveDiff?: boolean }) => {
    const { agentChapterStreaming } = get()
    if (agentChapterStreaming) {
      const meta = get().chapters.find((c) => c.id === chapterId)
      set({
        activeChapterId: chapterId,
        activeVolumeId: meta?.volumeId ?? get().activeVolumeId,
      })
      return
    }
    const chapter = await api.getChapter(chapterId)
    set({
      activeChapterId: chapter.id,
      activeVolumeId: chapter.volumeId,
      chapterContent: chapter.content ?? '',
      chapterDirty: false,
      ...(options?.preserveDiff
        ? {}
        : { chapterDiffBaseline: null, chapterDiffActive: false }),
    })
  },

  updateChapterContent: (content: string) => {
    set({ chapterContent: content, chapterDirty: true })
  },

  saveActiveChapter: async () => {
    const { activeChapterId, chapterContent } = get()
    if (!activeChapterId) return
    await api.updateChapter(activeChapterId, { content: chapterContent })
    set({ chapterDirty: false })
    const novelId = get().activeNovelId
    if (novelId) {
      await get().loadChapters(novelId)
    }
  },

  addVolume: async (title: string) => {
    const novelId = get().activeNovelId
    if (!novelId) return null
    const volume = await api.createVolume(novelId, { title })
    await get().loadVolumes(novelId)
    set({ activeVolumeId: volume.id })
    return volume
  },

  addChapter: async (title = '新章节', volumeId?: string) => {
    const novelId = get().activeNovelId
    if (!novelId) return null
    const { volumes, activeVolumeId } = get()
    const targetVolumeId = volumeId ?? activeVolumeId ?? volumes[0]?.id
    const chapter = await api.createChapter(novelId, {
      title,
      content: '',
      volumeId: targetVolumeId,
    })
    await get().loadVolumes(novelId)
    await get().loadChapters(novelId)
    await get().selectChapter(chapter.id)
    return chapter
  },

  deleteChapter: async (chapterId: string) => {
    const novelId = get().activeNovelId
    if (!novelId) return
    await api.deleteChapter(chapterId)
    const wasActive = get().activeChapterId === chapterId
    await get().loadChapters(novelId)
    if (!wasActive) return
    const next = get().chapters[0]
    if (next) {
      await get().selectChapter(next.id)
      return
    }
    set({
      activeChapterId: null,
      chapterContent: '',
      chapterDirty: false,
      chapterDiffActive: false,
      chapterDiffBaseline: null,
    })
  },

  renameChapter: async (chapterId: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    await api.updateChapter(chapterId, { title: trimmed })
    const novelId = get().activeNovelId
    if (novelId) {
      await get().loadChapters(novelId)
    }
  },

  reorderVolumes: async (volumeIds: string[]) => {
    const novelId = get().activeNovelId
    if (!novelId) return
    await api.reorderVolumes(novelId, volumeIds)
    await get().loadVolumes(novelId)
    await get().loadChapters(novelId)
  },

  applyChapterReorderPlans: async (plans) => {
    for (const plan of plans) {
      await api.reorderVolumeChapters(plan.volumeId, plan.ids)
    }
    const novelId = get().activeNovelId
    if (novelId) {
      await get().loadChapters(novelId)
    }
  },

  refreshActiveChapter: async () => {
    const { activeChapterId, activeNovelId } = get()
    if (activeChapterId) {
      await get().selectChapter(activeChapterId)
    } else if (activeNovelId) {
      await get().loadVolumes(activeNovelId)
      await get().loadChapters(activeNovelId)
    }
  },

  reloadActiveChapterContent: async () => {
    const { activeChapterId, chapterDirty, agentChapterStreaming } = get()
    if (!activeChapterId || chapterDirty || agentChapterStreaming) return
    const chapter = await api.getChapter(activeChapterId)
    set({
      chapterContent: chapter.content ?? '',
      chapterDirty: false,
      activeVolumeId: chapter.volumeId,
    })
  },

  snapshotChapterDiffBeforeAgent: () => {
    const { chapterContent, activeChapterId } = get()
    if (!activeChapterId) return
    set({
      chapterDiffBaseline: chapterContent,
      chapterDiffActive: false,
    })
  },

  beginAgentChapterStream: ({ title, chapterId }) => {
    const novelId = get().activeNovelId
    const { activeChapterId, chapterContent } = get()
    const sameChapter = Boolean(chapterId && chapterId === activeChapterId)
    set({
      agentChapterStreaming: true,
      agentChapterStreamTitle: title,
      agentChapterStreamPhase: 'generating',
      activeChapterId: chapterId ?? activeChapterId,
      chapterDiffBaseline: sameChapter ? chapterContent : get().chapterDiffBaseline,
      chapterDiffActive: false,
      chapterContent: sameChapter ? chapterContent : '',
      chapterDirty: false,
    })
    if (novelId) {
      void api.listChapters(novelId).then((chapters) => set({ chapters }))
    }
  },

  markAgentChapterStreamSaving: () => {
    set((state) =>
      state.agentChapterStreaming
        ? { agentChapterStreamPhase: 'saving' }
        : state,
    )
  },

  appendAgentChapterStream: (delta) => {
    if (!delta) return
    set((state) => ({
      chapterContent: state.chapterContent + delta,
      chapterDirty: false,
    }))
  },

  finishAgentChapterStream: () => {
    set({
      agentChapterStreaming: false,
      agentChapterStreamTitle: '',
      agentChapterStreamPhase: 'idle',
    })
    get().activateChapterDiffIfChanged()
  },

  activateChapterDiffIfChanged: () => {
    const { chapterDiffBaseline, chapterContent } = get()
    if (chapterDiffBaseline == null) return
    if (chapterDiffBaseline === chapterContent) {
      set({ chapterDiffBaseline: null, chapterDiffActive: false })
      return
    }
    set({ chapterDiffActive: true })
  },

  dismissChapterDiff: () => {
    const { chapterDiffBaseline } = get()
    if (chapterDiffBaseline == null) {
      set({ chapterDiffActive: false })
      return
    }
    set({
      chapterContent: chapterDiffBaseline,
      chapterDiffBaseline: null,
      chapterDiffActive: false,
      chapterDirty: true,
    })
  },

  acceptChapterDiff: () => {
    set({ chapterDiffBaseline: null, chapterDiffActive: false, chapterDirty: true })
  },

  selectChapterAfterAgentWrite: async (preferredTitle) => {
    const novelId = get().activeNovelId
    if (!novelId) return
    const prevChapterId = get().activeChapterId
    const streamedContent = get().chapterContent
    set({ loadingChapters: true })
    try {
      const chapters = await api.listChapters(novelId)
      set({ chapters })
      if (chapters.length === 0) {
        set({
          activeChapterId: null,
          chapterContent: '',
          chapterDirty: false,
          chapterDiffBaseline: null,
          chapterDiffActive: false,
        })
        return
      }
      const titleKey = (preferredTitle ?? '').trim()
      const matched =
        titleKey.length > 0
          ? chapters.find((c) => c.title === titleKey || c.title.includes(titleKey))
          : undefined
      const target = matched?.id ?? chapters[chapters.length - 1]?.id ?? chapters[0].id
      const meta = chapters.find((c) => c.id === target)
      if (streamedContent.trim()) {
        set({
          activeChapterId: target,
          activeVolumeId: meta?.volumeId ?? get().activeVolumeId,
          chapterContent: streamedContent,
          chapterDirty: false,
        })
        if (target === prevChapterId) {
          get().activateChapterDiffIfChanged()
        } else {
          set({ chapterDiffBaseline: null, chapterDiffActive: false })
        }
        return
      }
      await get().selectChapter(target, { preserveDiff: true })
      if (target !== prevChapterId) {
        set({ chapterDiffBaseline: null, chapterDiffActive: false })
      } else {
        get().activateChapterDiffIfChanged()
      }
    } finally {
      set({
        loadingChapters: false,
        agentChapterStreaming: false,
        agentChapterStreamTitle: '',
        agentChapterStreamPhase: 'idle',
      })
    }
  },
}))
