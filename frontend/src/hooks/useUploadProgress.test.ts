import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUploadProgress } from './useUploadProgress'
import type { UploadedFile } from '@/types/file'

vi.mock('@/api/uploadApi', () => ({
  getUploadedFile: vi.fn(),
}))

import { getUploadedFile } from '@/api/uploadApi'

const makeFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  fileId: 'f1',
  status: 'parsing',
  progress: 0,
  originalName: 'a.txt',
  sizeBytes: 10,
  format: 'txt',
  parseError: null,
  catalogNovelId: null,
  createdAt: 1,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(getUploadedFile).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useUploadProgress', () => {
  it('returns the initial file when not pending/parsing', () => {
    const ready = makeFile({ status: 'ready' })
    const { result } = renderHook(() => useUploadProgress(ready))
    expect(result.current).toEqual(ready)
    expect(getUploadedFile).not.toHaveBeenCalled()
  })

  it('polls every 2s while parsing and updates state', async () => {
    const parsing = makeFile({ status: 'parsing', progress: 10 })
    const progressed = makeFile({ status: 'parsing', progress: 50 })
    const ready = makeFile({ status: 'ready', progress: 100 })

    vi.mocked(getUploadedFile)
      .mockResolvedValueOnce(progressed)
      .mockResolvedValueOnce(ready)

    const { result } = renderHook(() => useUploadProgress(parsing))

    // first tick at 2s
    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    expect(getUploadedFile).toHaveBeenCalledTimes(1)
    expect(result.current?.progress).toBe(50)

    // second tick at 4s
    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    expect(getUploadedFile).toHaveBeenCalledTimes(2)
    expect(result.current?.status).toBe('ready')
  })

  it('fires onDone once when reaching ready', async () => {
    const parsing = makeFile({ status: 'parsing' })
    const ready = makeFile({ status: 'ready' })
    vi.mocked(getUploadedFile).mockResolvedValueOnce(ready)

    const onDone = vi.fn()
    const { result } = renderHook(() => useUploadProgress(parsing, onDone))

    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(ready)
    expect(result.current?.status).toBe('ready')

    // after ready, polling stops; advancing timer should not call again
    await act(async () => {
      vi.advanceTimersByTimeAsync(4000)
    })
    expect(getUploadedFile).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('fires onDone when reaching failed', async () => {
    const parsing = makeFile({ status: 'parsing' })
    const failed = makeFile({ status: 'failed', parseError: 'bad pdf' })
    vi.mocked(getUploadedFile).mockResolvedValueOnce(failed)

    const onDone = vi.fn()
    renderHook(() => useUploadProgress(parsing, onDone))

    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    expect(onDone).toHaveBeenCalledWith(failed)
  })

  it('keeps polling on transient errors without crashing', async () => {
    const parsing = makeFile({ status: 'parsing' })
    const ready = makeFile({ status: 'ready' })
    vi.mocked(getUploadedFile)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(ready)

    const { result } = renderHook(() => useUploadProgress(parsing))

    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    // error swallowed, state unchanged
    expect(result.current?.status).toBe('parsing')

    await act(async () => {
      vi.advanceTimersByTimeAsync(2000)
    })
    expect(result.current?.status).toBe('ready')
  })

  it('syncs state when the file prop changes', () => {
    const parsing = makeFile({ status: 'parsing', fileId: 'f1' })
    const other = makeFile({ status: 'parsing', fileId: 'f2' })
    const { result, rerender } = renderHook(({ f }: { f: UploadedFile }) => useUploadProgress(f), {
      initialProps: { f: parsing },
    })
    expect(result.current?.fileId).toBe('f1')
    rerender({ f: other })
    expect(result.current?.fileId).toBe('f2')
  })
})
