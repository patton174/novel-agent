import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProTabs } from './ProTabs'

describe('ProTabs', () => {
  it('renders first tab content by default', () => {
    render(
      <ProTabs
        tabs={[{ key: 'a', label: 'A', content: <div>内容A</div> }, { key: 'b', label: 'B', content: <div>内容B</div> }]}
      />,
    )
    expect(screen.getByText('内容A')).toBeInTheDocument()
  })

  it('switches content on tab click', () => {
    render(
      <ProTabs
        tabs={[{ key: 'a', label: 'A', content: <div>内容A</div> }, { key: 'b', label: 'B', content: <div>内容B</div> }]}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'B' }))
    expect(screen.getByText('内容B')).toBeInTheDocument()
  })
})
