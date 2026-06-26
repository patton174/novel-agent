import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PixelBadge } from './PixelBadge'
import { PixelCellStack } from './PixelTableCell'
import { PixelTable } from './PixelTable'

describe('PixelTable kit', () => {
  it('PixelBadge renders tone class', () => {
    render(<PixelBadge tone="success">OK</PixelBadge>)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('PixelCellStack renders title and subtitle', () => {
    render(<PixelCellStack title="Pro" subtitle="pro · ¥99" />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('pro · ¥99')).toBeInTheDocument()
  })

  it('PixelTable renders empty state', () => {
    render(
      <PixelTable
        columns={[{ key: 'name', header: 'Name', render: (r: { name: string }) => r.name }]}
        data={[]}
        rowKey="name"
        emptyText="无数据"
      />,
    )
    expect(screen.getByText('无数据')).toBeInTheDocument()
  })
})
