import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NeumorphicSwitch } from './NeumorphicSwitch'

describe('NeumorphicSwitch', () => {
  it('calls onChange when toggled', () => {
    const onChange = vi.fn()
    render(
      <NeumorphicSwitch
        checked={false}
        onChange={onChange}
        aria-label="托管模式"
      />,
    )

    const input = screen.getByLabelText('托管模式')
    fireEvent.click(input)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
