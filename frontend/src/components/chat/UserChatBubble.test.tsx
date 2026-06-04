import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserChatBubble } from './UserChatBubble'

describe('UserChatBubble', () => {
  it('renders content and copy/edit actions', () => {
    const onEdit = vi.fn()
    render(<UserChatBubble content="你好" onEdit={onEdit} />)
    expect(screen.getByText('你好')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('编辑'))
    expect(onEdit).toHaveBeenCalled()
  })
})
