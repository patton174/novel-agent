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
  it('renders six group subtitles', () => {
    wrap()
    expect(screen.getAllByText('概览').length).toBeGreaterThan(0)
    expect(screen.getAllByText('数据').length).toBeGreaterThan(0)
    expect(screen.getAllByText('计费').length).toBeGreaterThan(0)
    expect(screen.getAllByText('用户').length).toBeGreaterThan(0)
    expect(screen.getAllByText('内容').length).toBeGreaterThan(0)
    expect(screen.getAllByText('系统').length).toBeGreaterThan(0)
  })

  it('renders key admin nav links', () => {
    wrap()
    expect(screen.getByRole('link', { name: '数据分析' })).toHaveAttribute('href', '/admin/analytics')
    expect(screen.getByRole('link', { name: '用户管理' })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: '订单管理' })).toHaveAttribute('href', '/admin/billing/orders')
    expect(screen.getByRole('link', { name: '系统参数' })).toHaveAttribute('href', '/admin/system/settings')
  })

  it('renders the back-to-user link in the footer', () => {
    wrap()
    expect(screen.getByRole('link', { name: '返回用户端' })).toHaveAttribute('href', '/dashboard')
  })
})
