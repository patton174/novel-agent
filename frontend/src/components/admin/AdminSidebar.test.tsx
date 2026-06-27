import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { AdminSidebar } from './AdminSidebar'

const wrap = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AdminSidebar />
      </MemoryRouter>
    </I18nextProvider>,
  )

describe('AdminSidebar', () => {
  it('renders five collapsible group headers (overview is flat)', () => {
    wrap()
    expect(screen.getByRole('link', { name: '概览' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '数据' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '计费' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '用户' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '系统' })).toBeInTheDocument()
  })

  it('renders key admin nav links', () => {
    wrap()
    expect(screen.getByRole('link', { name: '平台' })).toHaveAttribute('href', '/admin/analytics/platform')
    expect(screen.getByRole('link', { name: '用户管理' })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: '订单管理' })).toHaveAttribute('href', '/admin/billing/orders')
    expect(screen.getByRole('link', { name: '系统参数' })).toHaveAttribute('href', '/admin/system/settings')
  })

  it('renders the back-to-user link in the footer', () => {
    wrap()
    expect(screen.getByRole('link', { name: '返回用户端' })).toHaveAttribute('href', '/dashboard')
  })
})
