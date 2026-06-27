import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconHome, IconBook } from '@tabler/icons-react'
import { ProSidebar, type ProSidebarGroup } from './ProSidebar'

const groups: ProSidebarGroup[] = [
  { title: '概览', items: [{ label: '首页', to: '/', icon: IconHome, end: true }] },
  { title: '创作', items: [{ label: '小说', to: '/novels', icon: IconBook }] },
]

describe('ProSidebar', () => {
  it('renders nav item labels', () => {
    render(<MemoryRouter><ProSidebar groups={groups} /></MemoryRouter>)
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('小说')).toBeInTheDocument()
  })

  it('renders item labels as links', () => {
    render(<MemoryRouter><ProSidebar groups={groups} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '小说' })).toHaveAttribute('href', '/novels')
  })

  it('renders group without title when title omitted', () => {
    render(<MemoryRouter><ProSidebar groups={[{ items: [{ label: '首页', to: '/', icon: IconHome, end: true }] }]} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument()
  })
})
