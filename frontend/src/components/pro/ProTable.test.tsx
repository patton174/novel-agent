import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProTable, type ProColumn } from './ProTable'

interface Row { id: number; name: string; status: string }

const columns: ProColumn<Row>[] = [
  { key: 'name', header: '名称', render: (r) => r.name },
  { key: 'status', header: '状态', render: (r) => r.status },
]

describe('ProTable', () => {
  it('renders headers and rows', () => {
    render(<ProTable columns={columns} data={[{ id: 1, name: '张三', status: '活跃' }]} rowKey="id" />)
    expect(screen.getByText('名称')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
  })

  it('renders empty state when data empty', () => {
    render(<ProTable columns={columns} data={[]} rowKey="id" emptyText="暂无数据" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('renders skeleton rows when loading', () => {
    const { container } = render(<ProTable columns={columns} data={[]} rowKey="id" loading skeletonRows={3} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
