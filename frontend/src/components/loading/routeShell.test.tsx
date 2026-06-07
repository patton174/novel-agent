import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RouteFallbackShell from './RouteFallbackShell'

describe('RouteFallbackShell', () => {
  it('renders dashboard shell skeleton for dashboard routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/novels']}>
        <RouteFallbackShell />
      </MemoryRouter>,
    )
    expect(container.querySelector('aside.hidden.md\\:block')).not.toBeNull()
  })

  it('renders admin shell skeleton for admin routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <RouteFallbackShell />
      </MemoryRouter>,
    )
    expect(container.querySelector('aside.hidden.md\\:block')).not.toBeNull()
  })

  it('renders editor loader for editor routes', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <RouteFallbackShell />
      </MemoryRouter>,
    )
    expect(getByText('正在打开编辑器')).toBeInTheDocument()
  })
})
