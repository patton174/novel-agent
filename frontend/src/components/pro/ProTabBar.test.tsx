import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconHome, IconBook, IconBooks, IconUser } from '@tabler/icons-react'
import { ProTabBar } from './ProTabBar'

const items = [
  { label: '概览', to: '/', icon: IconHome, end: true },
  { label: '小说', to: '/novels', icon: IconBook },
  { label: '书库', to: '/library', icon: IconBooks },
  { label: '我的', to: '/me', icon: IconUser },
]

describe('ProTabBar', () => {
  it('renders 4 tab links', () => {
    render(<MemoryRouter><ProTabBar items={items} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '概览' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我的' })).toBeInTheDocument()
  })

  it('has md:hidden class to stay mobile-only', () => {
    const { container } = render(<MemoryRouter><ProTabBar items={items} /></MemoryRouter>)
    expect(container.firstChild).not.toBeNull()
    expect((container.firstChild as HTMLElement).className).toContain('md:hidden')
  })
})
