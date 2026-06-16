import { afterEach, describe, expect, it, vi } from 'vitest'
import { secureFetch } from '../security/secureFetch'
import { openAgentRunSseStream, openAgentStream } from './api'

vi.mock('../security/secureFetch', () => ({
  secureFetch: vi.fn(),
}))

function mockEventStream(chunks: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index += 1
    },
  })

  vi.mocked(secureFetch).mockResolvedValue({
    ok: true,
    body,
  } as Response)
}

describe('openAgentStream', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('emits events from chunked SSE frames and finishes after stream-end', async () => {
    mockEventStream([
      'event: agent-event\ndata: {"type":"think.delta","payload":{"text":"你"}}\n\n',
      'event: agent-event\ndata: {"type":"think.delta","payload":{"text":"好"}}\n\n',
      'event: stream-end\ndata: done\n\n',
    ])

    const received: Array<[string, string]> = []
    await openAgentStream({ message: 'hi', mode: 'continue' }, (event, data) => {
      received.push([event, data])
    })

    expect(received).toHaveLength(3)
    expect(received[0][0]).toBe('agent-event')
    expect(received[1][0]).toBe('agent-event')
    expect(received[2]).toEqual(['stream-end', 'done'])
    expect(secureFetch).toHaveBeenCalledOnce()
  })

  it('preserves a trailing partial frame until the next chunk arrives', async () => {
    mockEventStream(['event: stream-end\ndata: do', 'ne\n\n'])

    const received: string[] = []
    await openAgentStream({ message: 'hi', mode: 'continue' }, (event) => {
      received.push(event)
    })

    expect(received).toEqual(['stream-end'])
  })

  it('aborts an in-flight read when the signal is cancelled', async () => {
    const encoder = new TextEncoder()
    let readCount = 0
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        readCount += 1
        if (readCount === 1) {
          controller.enqueue(
            encoder.encode('event: agent-event\ndata: {"type":"think.delta"}\n\n'),
          )
          return
        }
        await new Promise(() => {
          // block until abort cancels the reader
        })
      },
    })

    vi.mocked(secureFetch).mockResolvedValue({
      ok: true,
      body,
    } as Response)

    const controller = new AbortController()
    const received: string[] = []

    const streamPromise = openAgentStream(
      { message: 'hi', mode: 'continue' },
      (event) => {
        received.push(event)
        if (received.length === 1) {
          controller.abort()
        }
      },
      { signal: controller.signal },
    )

    await expect(streamPromise).rejects.toMatchObject({ name: 'AbortError' })
    expect(received).toHaveLength(1)
  })

  it('resume uses POST /chat/stream with run_id', async () => {
    mockEventStream(['event: stream-end\ndata: done\n\n'])

    await openAgentRunSseStream('run_abc', () => {}, { afterSequence: 3, sessionId: 'sess_1' })

    expect(secureFetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(secureFetch).mock.calls[0]
    expect(url).toContain('/agent/chat/stream')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body))
    expect(body.run_id).toBe('run_abc')
    expect(body.after_sequence).toBe(3)
    expect(body.session_id).toBe('sess_1')
    expect(body.message).toBe('')
  })
})
