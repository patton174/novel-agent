import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProPagination } from './ProPagination'

describe('ProPagination', () => {
  it('shows total and range', () => {
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByText(/1-10/)).toBeInTheDocument()
    expect(screen.getByText(/\/\s*35/)).toBeInTheDocument()
  })

  it('calls onPageChange with next page', () => {
    const onChange = vi.fn()
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables prev on first page', () => {
    render(<ProPagination page={1} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<ProPagination page={4} pageSize={10} total={35} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })
})
