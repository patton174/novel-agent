import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProAreaChart } from './ProAreaChart'

describe('ProAreaChart', () => {
  it('renders without throwing', () => {
    const { container } = render(
      <ProAreaChart data={[{ x: '1', y: 10 }, { x: '2', y: 20 }]} valueKey="y" xKey="x" />,
    )
    expect(container.firstChild).not.toBeNull()
  })

  it('renders empty state when data is empty', () => {
    const { getByText } = render(<ProAreaChart data={[]} valueKey="y" xKey="x" emptyText="暂无数据" />)
    expect(getByText('暂无数据')).toBeInTheDocument()
  })
})
