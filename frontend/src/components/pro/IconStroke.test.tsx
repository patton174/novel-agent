import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconHome } from '@tabler/icons-react'
import { IconStroke } from './IconStroke'

describe('IconStroke', () => {
  it('renders the wrapped icon', () => {
    render(<IconStroke icon={IconHome} label="首页" />)
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
  })

  it('applies active class when active=true', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" active />)
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).toContain('pro-icon-stroke--active')
  })

  it('does not apply active class when active=false', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" />)
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).not.toContain('pro-icon-stroke--active')
  })

  it('respects reduced motion by not animating when prefersReducedMotion=true', () => {
    const { container } = render(
      <IconStroke icon={IconHome} label="首页" active prefersReducedMotion />,
    )
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.className).toContain('pro-icon-stroke--reduced')
  })
})
