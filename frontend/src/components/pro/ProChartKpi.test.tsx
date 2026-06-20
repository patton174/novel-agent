import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProChartKpi } from './ProChartKpi'

describe('ProChartKpi', () => {
  it('renders label and value', () => {
    render(<ProChartKpi label="Token 消耗" value="1,284,930" />)
    expect(screen.getByText('1,284,930')).toBeInTheDocument()
    expect(screen.getByText('Token 消耗')).toBeInTheDocument()
  })

  it('renders up trend with positive delta', () => {
    render(<ProChartKpi label="x" value="1" trend={{ delta: 12.4, direction: 'up' }} />)
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
    expect(screen.getByText(/12\.4%/).className).toContain('text-success')
  })

  it('renders down trend with negative styling', () => {
    render(<ProChartKpi label="x" value="1" trend={{ delta: -3.1, direction: 'down' }} />)
    expect(screen.getByText(/-3\.1%/)).toBeInTheDocument()
  })

  it('shows skeleton when loading', () => {
    const { container } = render(<ProChartKpi label="x" value="" loading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
