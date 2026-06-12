import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './switch'

describe('Switch', () => {
  it('calls onCheckedChange when toggled', () => {
    const onCheckedChange = vi.fn()
    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        aria-label="托管模式"
      />,
    )

    fireEvent.click(screen.getByRole('switch', { name: '托管模式' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
