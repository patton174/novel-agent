import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StreamingRevealContent } from './StreamingRevealContent'

describe('StreamingRevealContent', () => {
  it('renders static paragraphs when not animating', () => {
    render(
      <StreamingRevealContent
        messageKey="m1"
        animate={false}
        paragraphs={['第一段', '第二段']}
      />,
    )
    expect(screen.getByText('第一段')).toBeInTheDocument()
    expect(screen.getByText('第二段')).toBeInTheDocument()
  })

  it('starts typewriter stream when animating', () => {
    render(
      <StreamingRevealContent
        messageKey="m2"
        animate
        paragraphs={['雨夜重逢']}
      />,
    )
    expect(screen.getByTestId('typewriter-stream')).toBeInTheDocument()
  })
})
