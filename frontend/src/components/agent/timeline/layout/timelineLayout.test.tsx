import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrchestrationFlatSlot } from './OrchestrationFlatSlot'
import { TimelineBranchRow } from './TimelineBranchRow'
import { TimelineInsightRow } from './TimelineInsightRow'
import { TimelineToolRowShell } from './TimelineToolRowShell'

describe('timeline layout tiers', () => {
  it('OrchestrationFlatSlot marks tool vs text tiers with flat indent', () => {
    const { rerender } = render(
      <OrchestrationFlatSlot kind="tool">
        <span>tool</span>
      </OrchestrationFlatSlot>,
    )
    const toolSlot = screen.getByTestId('timeline-orchestration-tool')
    expect(toolSlot).toHaveAttribute('data-timeline-layout-tier', 'flat-tool')
    expect(toolSlot.className).toContain('pl-[calc(1.35rem+0.4rem)]')

    rerender(
      <OrchestrationFlatSlot kind="text">
        <span>text</span>
      </OrchestrationFlatSlot>,
    )
    const textSlot = screen.getByTestId('timeline-orchestration-text')
    expect(textSlot).toHaveAttribute('data-timeline-layout-tier', 'flat-text')
  })

  it('TimelineInsightRow uses insight tier and in-round branch variant', () => {
    render(
      <TimelineInsightRow
        testId="insight-fixture"
        inThinkRound
        leadIcon={<span data-testid="lead">icon</span>}
        headline={<span>思考</span>}
        body={<span>正文</span>}
      />,
    )
    expect(screen.getByTestId('insight-fixture')).toHaveAttribute(
      'data-timeline-layout-tier',
      'insight',
    )
    const branch = screen.getByTestId('insight-fixture-branch')
    expect(branch).toHaveAttribute('data-timeline-branch-variant', 'insight-in-round')
    expect(branch.className).toContain('pl-[calc(1.35rem+0.4rem)]')
  })

  it('TimelineInsightRow standalone branch does not force in-round padding twice', () => {
    render(
      <TimelineInsightRow
        testId="insight-out"
        leadIcon={<span>icon</span>}
        headline={<span>思考</span>}
        body={<span>正文</span>}
      />,
    )
    expect(screen.getByTestId('insight-out-branch')).toHaveAttribute(
      'data-timeline-branch-variant',
      'insight-standalone',
    )
  })

  it('TimelineToolRowShell grid branch aligns in tool-grid variant', () => {
    render(
      <TimelineToolRowShell
        testId="tool-fixture"
        leadIcon={<span data-testid="tool-lead">icon</span>}
        headline={<span>ReadMemory</span>}
        branch={<span>结果</span>}
      />,
    )
    expect(screen.getByTestId('tool-fixture')).toHaveAttribute(
      'data-timeline-layout-tier',
      'tool-root',
    )
    expect(screen.getByTestId('tool-fixture').className).toContain(
      'grid-cols-[1.35rem_minmax(0,1fr)]',
    )
    expect(screen.getByTestId('tool-fixture-branch')).toHaveAttribute(
      'data-timeline-branch-variant',
      'tool-grid',
    )
  })

  it('TimelineBranchRow nested variant has no extra pl', () => {
    render(
      <TimelineBranchRow variant="nested" testId="nested-branch">
        detail
      </TimelineBranchRow>,
    )
    const branch = screen.getByTestId('nested-branch')
    expect(branch).toHaveAttribute('data-timeline-branch-variant', 'nested')
    expect(branch.className).toContain('pl-0')
  })
})
