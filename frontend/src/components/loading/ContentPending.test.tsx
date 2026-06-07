import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContentPending } from './ContentPending'

describe('ContentPending', () => {
  it('renders status region with custom label', () => {
    const { container } = render(<ContentPending label="正在加载书库" />)
    const outer = container.firstElementChild
    expect(outer).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('正在加载书库')).toBeInTheDocument()
  })
})
