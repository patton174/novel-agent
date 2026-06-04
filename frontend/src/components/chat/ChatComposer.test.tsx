import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './ChatComposer'

describe('ChatComposer', () => {
  it('renders sharp textarea and sends on button click', () => {
    const onSend = vi.fn()
    const onChange = vi.fn()

    render(
      <ChatComposer
        value="你好"
        onChange={onChange}
        onSend={onSend}
        hostModeEnabled={false}
        onHostModeChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('chat-composer')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('send-btn'))
    expect(onSend).toHaveBeenCalled()
  })

  it('morphs send into stop while streaming and calls abort', () => {
    const onStreamAbort = vi.fn()

    render(
      <ChatComposer
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading
        streamActive
        onStreamAbort={onStreamAbort}
        hostModeEnabled={false}
        onHostModeChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('stream-stop-btn'))
    expect(onStreamAbort).toHaveBeenCalled()
  })
})
