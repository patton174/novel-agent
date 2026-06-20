import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconHome } from '@tabler/icons-react'
import { IconStroke } from './IconStroke'

describe('IconStroke', () => {
  it('exposes an accessible img role with the label when label provided', () => {
    render(<IconStroke icon={IconHome} label="首页" />)
    expect(screen.getByRole('img', { name: '首页' })).toBeInTheDocument()
  })

  it('hides icon from assistive tech when label omitted', () => {
    const { container } = render(<IconStroke icon={IconHome} />)
    const wrapper = container.querySelector('[data-icon-stroke]')
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true')
    expect(wrapper?.getAttribute('role')).toBeNull()
  })

  it('applies pro-icon-stroke--active class when active=true', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" active />)
    expect(container.querySelector('[data-icon-stroke]')?.className).toContain('pro-icon-stroke--active')
  })

  it('does not apply active class when active=false', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" />)
    expect(container.querySelector('[data-icon-stroke]')?.className).not.toContain('pro-icon-stroke--active')
  })

  it('applies pro-icon-stroke--reduced class when prefersReducedMotion=true', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" active prefersReducedMotion />)
    expect(container.querySelector('[data-icon-stroke]')?.className).toContain('pro-icon-stroke--reduced')
  })

  it('sets pathLength=1 attribute on svg path children (enables draw animation)', () => {
    const { container } = render(<IconStroke icon={IconHome} label="首页" active />)
    const paths = container.querySelectorAll('svg path')
    expect(paths.length).toBeGreaterThan(0)
    paths.forEach((p) => expect(p.getAttribute('pathLength')).toBe('1'))
  })
})
