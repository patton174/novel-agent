import type { AgentStreamRequestBody } from '../types/agent'
import type { MemoryNodeDTO, MemoryTreeResponse } from '../types/memoryNode'
import type {
  Chapter,
  ChapterSummary,
  ChapterVersion,
  CreateNovelPayload,
  Novel,
  ReindexJobStatus,
  Volume,
} from '../types/novel'
import i18n from '@/i18n'
import { DIRECT_PYTHON, PYTHON_API_BASE } from '../config/runtime'
import { getAuthHeaders, getUserId } from './auth'
import { secureFetch } from '../security/secureFetch'
import { fetchWsTicket } from '../security/wsTicket'
import { toStreamRequestBody } from './agentStreamPayload'
import { parseResultResponse, throwOnErrorResponse } from './resultApi'
import { parseSseFrame, splitSseBuffer } from './sse'
import { isPeerDroppedStreamError } from './agentStreamRecovery'

export type AgentStreamEventHandler = (eventName: string, data: string) => void

export type AgentStreamOpenOptions = RequestInit & {
  afterSequence?: number
}

function isResumeStreamBody(body: AgentStreamRequestBody): boolean {
  if (body.run_id?.trim()) {
    return true
  }
  return !body.message?.trim() && Boolean(body.session_id?.trim())
}

export async function openAgentStream(
  body: AgentStreamRequestBody,
  onEvent: AgentStreamEventHandler,
  init?: AgentStreamOpenOptions,
): Promise<void> {
  const signal = init?.signal ?? undefined
  const afterSequence = init?.afterSequence ?? body.after_sequence ?? -1

  throwIfAborted(signal)

  const streamUrl = `${PYTHON_API_BASE}/agent/chat/stream`
  const payload: AgentStreamRequestBody = isResumeStreamBody(body)
    ? {
        ...body,
        message: body.message ?? '',
        after_sequence: afterSequence,
      }
    : body

  const response = await secureFetch(streamUrl, {
    method: 'POST',
    headers: {
      ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
      ...init?.headers,
    },
    body: JSON.stringify(toStreamRequestBody(payload)),
    ...init,
  })

  throwIfAborted(signal)
  await consumeAgentSseResponse(response, onEvent, signal)
}

/** 断线重连：与 openAgentStream 同一路径 POST /chat/stream（run_id + after_sequence） */
export async function openAgentRunSseStream(
  runId: string,
  onEvent: AgentStreamEventHandler,
  init?: AgentStreamOpenOptions & { sessionId?: string },
): Promise<void> {
  return openAgentStream(
    {
      message: '',
      run_id: runId,
      session_id: init?.sessionId,
      after_sequence: init?.afterSequence ?? -1,
    },
    onEvent,
    init,
  )
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The stream was aborted', 'AbortError')
  }
}

async function consumeAgentSseResponse(
  response: Response,
  onEvent: AgentStreamEventHandler,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.ok || !response.body) {
    if (response.status === 401) {
      throw new Error(i18n.t('common:errors.auth.sessionExpired'))
    }
    if (response.status === 429) {
      const { appToast } = await import('../stores/appToastStore')
      appToast.error(i18n.t('common:errors.rateLimited'))
      throw new Error(i18n.t('common:errors.rateLimited'))
    }
    await throwOnErrorResponse(response)
    throw new Error(`Agent stream error: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const abortReader = () => {
    void reader.cancel()
  }

  if (signal) {
    signal.addEventListener('abort', abortReader, { once: true })
  }

  let streamEnded = false
  let receivedEvent = false
  try {
    // eslint-disable-next-line no-constant-condition -- SSE stream read loop
    while (true) {
      throwIfAborted(signal)
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const { frames, remainder } = splitSseBuffer(buffer)
      buffer = remainder

      for (const frame of frames) {
        const parsed = parseSseFrame(frame)
        if (parsed) {
          receivedEvent = true
          onEvent(parsed.event, parsed.data)
          if (parsed.event === 'stream-end') {
            streamEnded = true
            break
          }
        }
      }
      if (streamEnded) {
        void reader.cancel()
        break
      }
    }

    if (buffer.trim() && !streamEnded) {
      const parsed = parseSseFrame(buffer)
      if (parsed) {
        onEvent(parsed.event, parsed.data)
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      throw new DOMException('The stream was aborted', 'AbortError')
    }
    const msg = error instanceof Error ? error.message : String(error)
    if (receivedEvent && isPeerDroppedStreamError(msg)) {
      return
    }
    throw error
  } finally {
    if (signal) {
      signal.removeEventListener('abort', abortReader)
    }
    try {
      reader.releaseLock()
    } catch {
      // reader may already be released after cancel
    }
  }
}

async function buildAgentWsUrl(path: string, params: Record<string, string>): Promise<string | null> {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsBase = `${wsProtocol}//${window.location.host}`
  const pathBase = PYTHON_API_BASE.startsWith('/') ? PYTHON_API_BASE : `/${PYTHON_API_BASE}`
  const userId = getUserId()
  if (!userId) {
    return null
  }

  if (DIRECT_PYTHON) {
    const qs = new URLSearchParams({ ...params, userId })
    return `${wsBase}${pathBase}${path}?${qs.toString()}`
  }

  const purpose = path.includes('/run/ws') ? 'run' : 'status'
  const ticketResult = await fetchWsTicket({
    purpose,
    runId: params.runId,
    sessionId: params.sessionId,
  })
  if (!ticketResult?.ticket) {
    return null
  }
  const qs = new URLSearchParams({
    ...params,
    userId,
    ticket: ticketResult.ticket,
  })
  return `${wsBase}${pathBase}${path}?${qs.toString()}`
}

export async function openAgentRunSocket(runId: string): Promise<WebSocket | null> {
  const userId = getUserId()
  if (!userId || !runId) {
    return null
  }
  const url = await buildAgentWsUrl('/agent/run/ws', {
    runId,
    userId,
  })
  if (!url) {
    return null
  }
  return new WebSocket(url)
}

export function sendAgentRunInteraction(
  ws: WebSocket,
  runId: string,
  payload: {
    type: string
    selected?: Array<{ id: string; title: string; description?: string }>
    input?: string
    confirmed?: boolean
  },
): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(
    JSON.stringify({
      type: 'interaction.submit',
      run_id: runId,
      payload,
    }),
  )
}

export function sendAgentRunPause(ws: WebSocket, runId: string): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(JSON.stringify({ type: 'run.pause', run_id: runId }))
}

export function sendAgentRunResume(ws: WebSocket, runId: string): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(JSON.stringify({ type: 'run.resume', run_id: runId }))
}

export function sendAgentRunAbort(ws: WebSocket, runId: string): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(JSON.stringify({ type: 'run.abort', run_id: runId }))
}

export async function openAgentStatusSocket(
  sessionId: string,
  onStatus: AgentStreamEventHandler,
  options?: {
    onClose?: (event: CloseEvent) => void
    onOpen?: () => void
  },
): Promise<WebSocket | null> {
  const userId = getUserId()
  if (!userId || !sessionId) {
    return null
  }
  const url = await buildAgentWsUrl('/agent/chat/status/ws', {
    sessionId,
    userId,
  })
  if (!url) {
    return null
  }
  const ws = new WebSocket(url)
  ws.onopen = () => {
    options?.onOpen?.()
  }
  ws.onmessage = (event) => {
    if (typeof event.data === 'string' && event.data.trim()) {
      onStatus('agent-event', event.data)
    }
  }
  ws.onclose = (event) => {
    options?.onClose?.(event)
  }
  return ws
}

export const api = {
  baseUrl: '/api',

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await secureFetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })

    return parseResultResponse<T>(response)
  },

  // Novel APIs
  listNovels() {
    return this.request<Novel[]>('/content/auth/novels')
  },

  createNovel(data: CreateNovelPayload) {
    return this.request<Novel>('/content/auth/novels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getNovel(novelId: string) {
    return this.request<Novel>(`/content/auth/novels/${novelId}`)
  },

  updateNovel(novelId: string, data: Partial<CreateNovelPayload>) {
    return this.request<Novel>(`/content/auth/novels/${novelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteNovel(novelId: string) {
    return this.request<{ ok: boolean }>(`/content/auth/novels/${novelId}`, {
      method: 'DELETE',
    })
  },

  generateNovelCover(novelId: string) {
    return this.request<Novel>(`/content/auth/novels/${novelId}/cover/generate`, {
      method: 'POST',
    })
  },

  listChapters(novelId: string) {
    return this.request<ChapterSummary[]>(`/content/auth/novels/${novelId}/chapters`)
  },

  listVolumes(novelId: string) {
    return this.request<Volume[]>(`/content/auth/novels/${novelId}/volumes`)
  },

  createVolume(novelId: string, data: { title: string; description?: string }) {
    return this.request<Volume>(`/content/auth/novels/${novelId}/volumes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteVolume(volumeId: string) {
    return this.request<{ ok: boolean }>(`/content/auth/volumes/${volumeId}`, {
      method: 'DELETE',
    })
  },

  reorderVolumes(novelId: string, ids: string[]) {
    return this.request<Volume[]>(`/content/auth/novels/${novelId}/volumes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  reorderVolumeChapters(volumeId: string, ids: string[]) {
    return this.request<ChapterSummary[]>(`/content/auth/volumes/${volumeId}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  reorderNovelChapters(novelId: string, ids: string[]) {
    return this.request<ChapterSummary[]>(`/content/auth/novels/${novelId}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  createChapter(
    novelId: string,
    data: { title: string; content?: string; summary?: string; volumeId?: string },
  ) {
    return this.request<Chapter>(`/content/auth/novels/${novelId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getChapter(chapterId: string) {
    return this.request<Chapter>(`/content/auth/chapters/${chapterId}`)
  },

  updateChapter(chapterId: string, data: { title?: string; content?: string; summary?: string }) {
    return this.request<Chapter>(`/content/auth/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteChapter(chapterId: string) {
    return this.request<{ ok: boolean }>(`/content/auth/chapters/${chapterId}`, {
      method: 'DELETE',
    })
  },

  listChapterVersions(chapterId: string, limit = 20) {
    return this.request<ChapterVersion[]>(`/content/auth/chapters/${chapterId}/versions?limit=${limit}`)
  },

  restoreChapterVersion(chapterId: string, versionId: string) {
    return this.request<Chapter>(`/content/auth/chapters/${chapterId}/versions/${versionId}/restore`, {
      method: 'POST',
    })
  },

  reindexNovel(novelId: string) {
    return this.request<ReindexJobStatus>(
      `/content/auth/novels/${novelId}/reindex`,
      { method: 'POST' },
    )
  },

  getReindexStatus(novelId: string) {
    return this.request<ReindexJobStatus>(`/content/auth/novels/${novelId}/reindex/status`)
  },

  getKnowledgeGraph(novelId: string) {
    return this.request<{
      enabled?: boolean
      status?: string
      nodes?: Array<{ id: string; name: string; type?: string; aliases?: string }>
      edges?: Array<{ source: string; target: string; rel?: string }>
      errorCount?: number
      note?: string
    }>(`/content/auth/novels/${novelId}/knowledge-graph`)
  },

  backfillKnowledgeGraph(novelId: string) {
    return this.request<{ status: string }>(`/content/auth/novels/${novelId}/knowledge-graph/backfill`, {
      method: 'POST',
    })
  },

  getKnowledgeGraphProgress(novelId: string) {
    return this.request<{ status: string; total: number; done: number; failed: number }>(
      `/content/auth/novels/${novelId}/knowledge-graph/progress`,
    )
  },

  getKnowledgeGraphErrors(novelId: string) {
    return this.request<Array<{ chapterId?: string | null; reason: string; createdAt: number }>>(
      `/content/auth/novels/${novelId}/knowledge-graph/errors`,
    )
  },

  listNovelSessions(novelId: string, limit = 50) {
    return this.request<Array<{ id: string; title: string; updatedAt: number; novelId?: string }>>(
      `/content/auth/novels/${novelId}/sessions?limit=${limit}`,
    )
  },

  upsertContentSession(sessionId: string, title: string, novelId?: string) {
    return this.request<void>('/content/auth/sessions/upsert', {
      method: 'POST',
      body: JSON.stringify({ sessionId, title, novelId }),
    })
  },

  deleteContentSession(sessionId: string) {
    return this.request<void>(`/content/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
  },

  batchDeleteContentSessions(sessionIds: string[]) {
    return this.request<{ ok: boolean; deleted: number }>('/content/auth/sessions/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ sessionIds }),
    })
  },

  saveChapter(chapterId: string, content: string) {
    return this.updateChapter(chapterId, { content })
  },

  listContentSessions(limit = 50) {
    return this.request<Array<{ id: string; title: string; updatedAt: number; novelId?: string }>>(
      `/content/auth/sessions?limit=${limit}`,
    )
  },

  listContentMessages(sessionId: string, limit = 50) {
    return this.request<
      Array<{
        id: string
        role: 'user' | 'assistant'
        content: string
        createdAt: number
        runId?: string
        agentTraceJson?: string
      }>
    >(`/content/auth/sessions/${sessionId}/messages?limit=${limit}`)
  },

  saveAgentRunTrace(sessionId: string, runId: string, traceJson: string) {
    return this.request<void>(`/content/auth/sessions/${sessionId}/runs/${encodeURIComponent(runId)}/trace`, {
      method: 'PUT',
      body: JSON.stringify({ runId, traceJson }),
    })
  },

  fetchActiveAgentRun(sessionId: string) {
    return this.request<{
      id: string
      sessionId: string
      status: string
      mode?: string
      assistantMessageId?: string
    } | null>(`/content/auth/agent/sessions/${encodeURIComponent(sessionId)}/active-run`)
  },

  fetchAgentRunEvents(runId: string, afterSequence = -1) {
    return this.request<
      Array<{
        id: string
        runId: string
        sequence: number
        eventType: string
        payloadJson: string
      }>
    >(
      `/content/auth/agent/runs/${encodeURIComponent(runId)}/events?after_sequence=${afterSequence}`,
    )
  },

  async generateSessionTitle(payload: {
    user_message: string
    assistant_snippet?: string
    novel_title?: string
  }) {
    const response = await secureFetch(`${PYTHON_API_BASE}/agent/session/title`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
      },
      body: JSON.stringify(payload),
    })
    await throwOnErrorResponse(response)
    return response.json() as Promise<{ title: string }>
  },

  async getMemoryTree(novelId: string, scope: string): Promise<MemoryTreeResponse> {
    return this.request<MemoryTreeResponse>(
      `/content/auth/novels/${encodeURIComponent(novelId)}/memory-nodes/tree?scope=${encodeURIComponent(scope)}`,
    )
  },

  async getMemoryTreeIndex(novelId: string): Promise<Record<string, MemoryTreeResponse>> {
    return this.request<Record<string, MemoryTreeResponse>>(
      `/content/auth/novels/${encodeURIComponent(novelId)}/memory-nodes/tree-index`,
    )
  },

  async getMemoryNodesFlat(novelId: string, scope: string): Promise<MemoryNodeDTO[]> {
    const qs = new URLSearchParams({
      scope,
      includeContent: 'false',
    })
    return this.request<MemoryNodeDTO[]>(
      `/content/auth/novels/${encodeURIComponent(novelId)}/memory-nodes/flat?${qs.toString()}`,
    )
  },

  async getMemoryNode(novelId: string, memoryId: string): Promise<MemoryNodeDTO> {
    return this.request<MemoryNodeDTO>(
      `/content/auth/novels/${encodeURIComponent(novelId)}/memory-nodes/${encodeURIComponent(memoryId)}`,
    )
  },
}
