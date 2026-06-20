import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
  it('renders four group subtitles (概览/运营/内容/系统)', () => {
    wrap()
    // 「概览」既是分组标题也是「概览」导航项标签，故用 getAllByText 断言存在
    expect(screen.getAllByText('概览').length).toBeGreaterThan(0)
    expect(screen.getAllByText('运营').length).toBeGreaterThan(0)
    expect(screen.getAllByText('内容').length).toBeGreaterThan(0)
    expect(screen.getAllByText('系统').length).toBeGreaterThan(0)
  })

  it('renders all admin nav links', () => {
    wrap()
    expect(screen.getByRole('link', { name: '平台统计' })).toHaveAttribute('href', '/admin/stats')
    expect(screen.getByRole('link', { name: '用户管理' })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: '系统参数' })).toHaveAttribute('href', '/admin/system-settings')
  })

  it('renders the back-to-user link in the footer', () => {
    wrap()
    expect(screen.getByRole('link', { name: '返回用户端' })).toHaveAttribute('href', '/dashboard')
  })
})
