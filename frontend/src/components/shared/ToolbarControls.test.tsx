import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  TOOLBAR_CONTROL_HEIGHT,
  ToolbarButton,
  ToolbarSearchInput,
} from './ToolbarControls'

describe('ToolbarControls', () => {
  it('applies unified h-9 height to search input and button', () => {
    render(
      <div>
        <ToolbarSearchInput aria-label="search" />
        <ToolbarButton type="button">Refresh</ToolbarButton>
      </div>,
    )

    const input = screen.getByRole('textbox', { name: 'search' })
    const button = screen.getByRole('button', { name: 'Refresh' })

    expect(input.className).toContain(TOOLBAR_CONTROL_HEIGHT)
    expect(button.className).toContain(TOOLBAR_CONTROL_HEIGHT)
  })
})
