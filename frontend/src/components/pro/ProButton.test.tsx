import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProButton } from './ProButton'

describe('ProButton', () => {
  it('renders children', () => {
    render(<ProButton>保存</ProButton>)
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('applies primary variant classes by default', () => {
    render(<ProButton>保存</ProButton>)
    expect(screen.getByRole('button', { name: '保存' }).className).toContain('pro-btn--primary')
  })

  it('applies ghost variant', () => {
    render(<ProButton variant="ghost">取消</ProButton>)
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('pro-btn--ghost')
  })

  it('applies danger variant', () => {
    render(<ProButton variant="danger">删除</ProButton>)
    expect(screen.getByRole('button', { name: '删除' }).className).toContain('pro-btn--danger')
  })

  it('shows loading state and disables', () => {
    render(<ProButton loading>提交</ProButton>)
    const btn = screen.getByRole('button', { name: '提交' })
    expect(btn).toBeDisabled()
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })

  it('forwards ref', () => {
    let ref: HTMLButtonElement | null = null
    render(<ProButton ref={(el) => { ref = el }}>x</ProButton>)
    expect(ref).not.toBeNull()
  })
})
