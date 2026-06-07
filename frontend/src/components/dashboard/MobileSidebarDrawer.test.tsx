import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MobileSidebarDrawer } from './MobileSidebarDrawer'

vi.mock('@/components/dashboard/AppSidebar', () => ({
  AppSidebar: ({ embedded }: { embedded?: boolean }) => (
    <nav data-testid="app-sidebar" data-embedded={embedded ? 'true' : 'false'} />
  ),
}))

describe('MobileSidebarDrawer', () => {
  it('exposes mobile menu trigger with md:hidden class', () => {
    render(
      <MemoryRouter>
        <MobileSidebarDrawer />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', { name: '打开导航菜单' })
    expect(trigger.className).toContain('md:hidden')
  })
})
