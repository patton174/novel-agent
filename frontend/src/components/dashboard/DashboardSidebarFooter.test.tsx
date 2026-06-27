import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach } from 'vitest'
import { DashboardSidebarFooter } from './DashboardSidebarFooter'
import { useUserStore } from '@/stores/userStore'
import type { UserProfile } from '@/api/userApi'

const profile = (overrides: Partial<UserProfile> = {}): UserProfile =>
  ({
    userId: 'u1',
    username: 'alice',
    email: 'alice@example.com',
    emailVerified: true,
    role: 'USER',
    ...overrides,
  }) as UserProfile

describe('DashboardSidebarFooter', () => {
  beforeEach(() => {
    useUserStore.setState({ profile: null })
  })

  it('renders a settings link showing username + email', () => {
    useUserStore.setState({ profile: profile() })
    render(
      <MemoryRouter>
        <DashboardSidebarFooter />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard/settings/profile')
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows the unverified dot when email is unverified', () => {
    useUserStore.setState({ profile: profile({ emailVerified: false }) })
    const { container } = render(
      <MemoryRouter>
        <DashboardSidebarFooter />
      </MemoryRouter>,
    )
    // 未验证小圆点：bg-sky-500
    expect(container.querySelector('.bg-sky-500')).not.toBeNull()
  })

  it('hides the dot when email is verified', () => {
    useUserStore.setState({ profile: profile({ emailVerified: true }) })
    const { container } = render(
      <MemoryRouter>
        <DashboardSidebarFooter />
      </MemoryRouter>,
    )
    expect(container.querySelector('.bg-sky-500')).toBeNull()
  })
})
