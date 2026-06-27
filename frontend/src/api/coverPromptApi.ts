import { secureFetch } from '@/security/secureFetch'
import { parseResultResponse } from '@/utils/resultApi'

export interface CoverPromptBundle {
  stylePrompt: string
  scenePrompt: string
  imagePrompt: string
  layout?: string
  archetype?: string
}

export type CoverPromptStreamField = 'style' | 'scene'

export function composeCoverImagePrompt(stylePrompt: string, scenePrompt: string): string {
  const style = stylePrompt.trim().replace(/,+$/, '')
  const scene = scenePrompt.trim().replace(/[，,]+$/, '')
  if (style && scene) return `${style}, ${scene}`
  return style || scene
}

type StreamLine = {
  type?: string
  field?: string
  text?: string
  layout?: string
  archetype?: string
  style_prompt?: string
  scene_prompt?: string
  image_prompt?: string
  prompt?: string
}

function bundleFromDone(line: StreamLine): CoverPromptBundle {
  const style = line.style_prompt?.trim() ?? ''
  const scene = line.scene_prompt?.trim() ?? ''
  const imagePrompt = (line.image_prompt || line.prompt || composeCoverImagePrompt(style, scene)).trim()
  return {
    stylePrompt: style,
    scenePrompt: scene,
    imagePrompt,
    layout: line.layout,
    archetype: line.archetype,
  }
}

function isStreamField(field: string | undefined): field is CoverPromptStreamField {
  return field === 'style' || field === 'scene'
}

/** 解析 SSE（data: {...}\\n\\n）或兼容旧 NDJSON 行。 */
function consumeStreamBuffer(
  buffer: string,
  onLine: (line: StreamLine) => void,
): string {
  let rest = buffer
  while (true) {
    const sseIdx = rest.indexOf('\n\n')
    const nlIdx = rest.indexOf('\n')
    if (sseIdx >= 0 && (nlIdx < 0 || sseIdx <= nlIdx)) {
      const block = rest.slice(0, sseIdx)
      rest = rest.slice(sseIdx + 2)
      for (const raw of block.split('\n')) {
        const trimmed = raw.trim()
        if (!trimmed.startsWith('data:')) continue
        try {
          onLine(JSON.parse(trimmed.slice(5).trim()) as StreamLine)
        } catch {
          // skip
        }
      }
      continue
    }
    if (nlIdx >= 0) {
      const line = rest.slice(0, nlIdx).trim()
      rest = rest.slice(nlIdx + 1)
      if (!line) continue
      if (line.startsWith('data:')) {
        try {
          onLine(JSON.parse(line.slice(5).trim()) as StreamLine)
        } catch {
          // skip
        }
      } else {
        try {
          onLine(JSON.parse(line) as StreamLine)
        } catch {
          // skip legacy
        }
      }
      continue
    }
    break
  }
  return rest
}

export interface FetchCoverPromptOptions {
  novelId: string
  styleDraft?: string
  sceneDraft?: string
  mode?: 'generate' | 'optimize'
  signal?: AbortSignal
  onDelta?: (field: CoverPromptStreamField, text: string) => void
  onPhase?: (field: CoverPromptStreamField | null) => void
  onMeta?: (meta: { layout?: string; archetype?: string }) => void
}

async function streamCoverPrompt(options: FetchCoverPromptOptions): Promise<CoverPromptBundle | null> {
  const { novelId, styleDraft, sceneDraft, mode = 'generate', signal, onDelta, onPhase, onMeta } = options
  const res = await secureFetch(`/api/content/auth/novels/${novelId}/cover/prompt/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      styleDraft: styleDraft ?? '',
      sceneDraft: sceneDraft ?? '',
      draft: sceneDraft ?? '',
      mode,
    }),
    signal,
  })
  if (!res.ok || !res.body) {
    return null
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneBundle: CoverPromptBundle | null = null

  const handleLine = (line: StreamLine) => {
    if (line.type === 'meta') {
      onMeta?.({ layout: line.layout, archetype: line.archetype })
      return
    }
    if (line.type === 'delta' && isStreamField(line.field) && line.text) {
      onPhase?.(line.field)
      onDelta?.(line.field, line.text)
      return
    }
    if (line.type === 'done') {
      onPhase?.(null)
      doneBundle = bundleFromDone(line)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = consumeStreamBuffer(buffer, handleLine)
  }
  buffer = consumeStreamBuffer(buffer + '\n\n', handleLine)
  return doneBundle
}

async function suggestCoverPrompt(options: FetchCoverPromptOptions): Promise<CoverPromptBundle | null> {
  const { novelId, styleDraft, sceneDraft, mode = 'generate' } = options
  const res = await secureFetch(`/api/content/auth/novels/${novelId}/cover/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      styleDraft: styleDraft ?? '',
      sceneDraft: sceneDraft ?? '',
      draft: sceneDraft ?? '',
      mode,
    }),
  })
  if (!res.ok) return null
  const data = await parseResultResponse<{
    stylePrompt?: string
    scenePrompt?: string
    imagePrompt?: string
    prompt?: string
  }>(res)
  if (!data) return null
  const style = data.stylePrompt?.trim() ?? ''
  const scene = data.scenePrompt?.trim() ?? ''
  const imagePrompt = (data.imagePrompt || data.prompt || composeCoverImagePrompt(style, scene)).trim()
  return { stylePrompt: style, scenePrompt: scene, imagePrompt }
}

/** SSE 流式写入字段；失败时降级为普通请求。 */
export async function fetchCoverPrompt(options: FetchCoverPromptOptions): Promise<CoverPromptBundle | null> {
  try {
    const streamed = await streamCoverPrompt(options)
    if (streamed) return streamed
  } catch {
    if (options.signal?.aborted) return null
  }
  return suggestCoverPrompt(options)
}
