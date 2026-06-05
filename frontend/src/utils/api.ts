import type { AgentStreamRequestBody } from '../types/agent'
import type { StoryMemoryWire } from '../types/storyMemory'
import type {
  Chapter,
  ChapterSummary,
  ChapterVersion,
  CreateNovelPayload,
  Novel,
  ReindexJobStatus,
  Volume,
} from '../types/novel'
import { DIRECT_PYTHON, PYTHON_API_BASE } from '../config/runtime'
import { getAuthHeaders, getUserId } from './auth'
import { secureFetch } from '../security/secureFetch'
import { fetchWsTicket } from '../security/wsTicket'
import { toStreamRequestBody } from './agentStreamPayload'
import { parseSseFrame, splitSseBuffer } from './sse'

export type AgentStreamEventHandler = (eventName: string, data: string) => void

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The stream was aborted', 'AbortError')
  }
}

export async function openAgentStream(
  body: AgentStreamRequestBody,
  onEvent: AgentStreamEventHandler,
  init?: RequestInit,
): Promise<void> {
  const signal = init?.signal ?? undefined

  throwIfAborted(signal)

  const streamUrl = `${PYTHON_API_BASE}/agent/chat/stream`
  const response = await secureFetch(streamUrl, {
    method: 'POST',
    headers: {
      ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
      ...init?.headers,
    },
    body: JSON.stringify(toStreamRequestBody(body)),
    ...init,
  })

  throwIfAborted(signal)

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      throw new Error('未登录或登录已过期，请重新登录')
    }
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
    if (
      receivedEvent &&
      /incomplete chunked read|peer closed connection without sending complete message body/i.test(
        msg,
      )
    ) {
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
  ws.onmessage = (event) => {
    if (typeof event.data === 'string' && event.data.trim()) {
      onStatus('agent-event', event.data)
    }
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

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  },

  async callAI<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await secureFetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`AI Service Error: ${response.status}`)
    }

    return response.json()
  },

  // Novel APIs
  listNovels() {
    return this.request<Novel[]>('/content/novels')
  },

  createNovel(data: CreateNovelPayload) {
    return this.request<Novel>('/content/novels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getNovel(novelId: string) {
    return this.request<Novel>(`/content/novels/${novelId}`)
  },

  updateNovel(novelId: string, data: Partial<CreateNovelPayload>) {
    return this.request<Novel>(`/content/novels/${novelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteNovel(novelId: string) {
    return this.request<{ ok: boolean }>(`/content/novels/${novelId}`, {
      method: 'DELETE',
    })
  },

  listChapters(novelId: string) {
    return this.request<ChapterSummary[]>(`/content/novels/${novelId}/chapters`)
  },

  listVolumes(novelId: string) {
    return this.request<Volume[]>(`/content/novels/${novelId}/volumes`)
  },

  createVolume(novelId: string, data: { title: string; description?: string }) {
    return this.request<Volume>(`/content/novels/${novelId}/volumes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteVolume(volumeId: string) {
    return this.request<{ ok: boolean }>(`/content/volumes/${volumeId}`, {
      method: 'DELETE',
    })
  },

  reorderVolumes(novelId: string, ids: string[]) {
    return this.request<Volume[]>(`/content/novels/${novelId}/volumes/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  reorderVolumeChapters(volumeId: string, ids: string[]) {
    return this.request<ChapterSummary[]>(`/content/volumes/${volumeId}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  reorderNovelChapters(novelId: string, ids: string[]) {
    return this.request<ChapterSummary[]>(`/content/novels/${novelId}/chapters/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  createChapter(
    novelId: string,
    data: { title: string; content?: string; summary?: string; volumeId?: string },
  ) {
    return this.request<Chapter>(`/content/novels/${novelId}/chapters`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getChapter(chapterId: string) {
    return this.request<Chapter>(`/content/chapters/${chapterId}`)
  },

  updateChapter(chapterId: string, data: { title?: string; content?: string; summary?: string }) {
    return this.request<Chapter>(`/content/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteChapter(chapterId: string) {
    return this.request<{ ok: boolean }>(`/content/chapters/${chapterId}`, {
      method: 'DELETE',
    })
  },

  listChapterVersions(chapterId: string, limit = 20) {
    return this.request<ChapterVersion[]>(`/content/chapters/${chapterId}/versions?limit=${limit}`)
  },

  restoreChapterVersion(chapterId: string, versionId: string) {
    return this.request<Chapter>(`/content/chapters/${chapterId}/versions/${versionId}/restore`, {
      method: 'POST',
    })
  },

  reindexNovel(novelId: string) {
    return this.request<ReindexJobStatus>(
      `/content/novels/${novelId}/reindex`,
      { method: 'POST' },
    )
  },

  getReindexStatus(novelId: string) {
    return this.request<ReindexJobStatus>(`/content/novels/${novelId}/reindex/status`)
  },

  listNovelSessions(novelId: string, limit = 50) {
    return this.request<Array<{ id: string; title: string; updatedAt: number; novelId?: string }>>(
      `/content/novels/${novelId}/sessions?limit=${limit}`,
    )
  },

  upsertContentSession(sessionId: string, title: string, novelId?: string) {
    return this.request<void>('/content/sessions/upsert', {
      method: 'POST',
      body: JSON.stringify({ sessionId, title, novelId }),
    })
  },

  deleteContentSession(sessionId: string) {
    return this.request<void>(`/content/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
  },

  batchDeleteContentSessions(sessionIds: string[]) {
    return this.request<{ ok: boolean; deleted: number }>('/content/sessions/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ sessionIds }),
    })
  },

  // Legacy project APIs (deprecated)
  getProjects() {
    return this.request<any>('/projects')
  },

  createProject(data: any) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getChapters(projectId: string) {
    return this.request<any>(`/projects/${projectId}/chapters`)
  },

  saveChapter(chapterId: string, content: string) {
    return this.updateChapter(chapterId, { content })
  },

  // AI Generation APIs
  generate(data: any) {
    return this.request<any>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  listContentSessions(limit = 50) {
    return this.request<Array<{ id: string; title: string; updatedAt: number; novelId?: string }>>(
      `/content/sessions?limit=${limit}`,
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
    >(`/content/sessions/${sessionId}/messages?limit=${limit}`)
  },

  saveAgentRunTrace(sessionId: string, runId: string, traceJson: string) {
    return this.request<void>(`/content/sessions/${sessionId}/runs/${encodeURIComponent(runId)}/trace`, {
      method: 'PUT',
      body: JSON.stringify({ runId, traceJson }),
    })
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
    if (!response.ok) {
      throw new Error(`Session title error: ${response.status}`)
    }
    return response.json() as Promise<{ title: string }>
  },

  async getAgentStoryMemory(novelId: string): Promise<{
    novel_id: string
    memory: {
      novel: Record<string, string>
      world: Record<string, string>
      background: Record<string, string>
      characters: Record<string, Record<string, string>>
      chapters: Record<string, Record<string, string>>
    }
  }> {
    const response = await secureFetch(
      `${PYTHON_API_BASE}/agent/memory/novel/${encodeURIComponent(novelId)}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
        },
      },
    )
    if (!response.ok) {
      throw new Error(`Agent memory error: ${response.status}`)
    }
    return response.json()
  },

  async patchAgentStoryMemory(
    novelId: string,
    payload: { scope: string; key: string; value: string; item_id?: string },
  ): Promise<{ memory: StoryMemoryWire }> {
    const response = await secureFetch(
      `${PYTHON_API_BASE}/agent/memory/novel/${encodeURIComponent(novelId)}/patch`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      throw new Error(`Agent memory patch error: ${response.status}`)
    }
    return response.json()
  },

  async deleteAgentStoryMemory(
    novelId: string,
    payload: { scope: string; key: string; item_id?: string },
  ): Promise<{ memory: StoryMemoryWire }> {
    const response = await secureFetch(
      `${PYTHON_API_BASE}/agent/memory/novel/${encodeURIComponent(novelId)}/delete`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      throw new Error(`Agent memory delete error: ${response.status}`)
    }
    return response.json()
  },

  async clearAgentStoryMemoryScope(
    novelId: string,
    payload: { scope: string },
  ): Promise<{ memory: StoryMemoryWire }> {
    const response = await secureFetch(
      `${PYTHON_API_BASE}/agent/memory/novel/${encodeURIComponent(novelId)}/clear`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(DIRECT_PYTHON ? {} : getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      throw new Error(`Agent memory clear error: ${response.status}`)
    }
    return response.json()
  },
}
