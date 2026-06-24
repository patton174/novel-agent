import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './ChatComposer'

vi.mock('@/components/model/ModelSelector', () => ({
  ModelSelector: ({
    onChange,
  }: {
    value?: string | null
    onChange: (v: string | null) => void
  }) => (
    <select
      data-testid="model-selector"
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">default</option>
      <option value="pub:test">Test Model</option>
    </select>
  ),
}))

describe('ChatComposer', () => {
  it('renders sharp textarea and sends on button click', () => {
    const onSend = vi.fn()
    const onChange = vi.fn()

    render(
      <ChatComposer
        value="你好"
        onChange={onChange}
        onSend={onSend}
        modelOverride={null}
        onModelOverrideChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('chat-composer')).toBeInTheDocument()
    expect(screen.getByTestId('composer-attach-btn')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('send-btn'))
    expect(onSend).toHaveBeenCalled()
  })

  it('morphs send into pause while streaming and calls pause handler', () => {
    const onStreamPause = vi.fn()

    render(
      <ChatComposer
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading
        streamActive
        onStreamPause={onStreamPause}
        modelOverride={null}
        onModelOverrideChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('stream-pause-btn'))
    expect(onStreamPause).toHaveBeenCalled()
  })

  it('falls back to abort when pause handler is missing', () => {
    const onStreamAbort = vi.fn()

    render(
      <ChatComposer
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading
        streamActive
        onStreamAbort={onStreamAbort}
        modelOverride={null}
        onModelOverrideChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('stream-pause-btn'))
    expect(onStreamAbort).toHaveBeenCalled()
  })
})
