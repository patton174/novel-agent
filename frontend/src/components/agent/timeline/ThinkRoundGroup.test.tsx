import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ThinkRoundItem } from '../../../utils/agentStreamTimeline'
import { ThinkRoundGroup } from './ThinkRoundGroup'
import { CcToolRow } from './CcToolRow'

const fixtureItems: ThinkRoundItem[] = [
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'think-a',
        text: '第一句。末句一。',
        stepId: 's1',
        status: 'done',
      },
    ],
  },
  {
    kind: 'tools',
    blocks: [{ kind: 'tool', id: 'tool-1', stepId: 'tool-step-1' }],
  },
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'think-b',
        text: '第二句。末句二。',
        stepId: 's2',
        status: 'done',
      },
    ],
  },
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'think-c',
        text: '第三句。末句三。',
        stepId: 's3',
        status: 'done',
      },
    ],
  },
]

describe('ThinkRoundGroup', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('indents tool rows and draws one rail segment per adjacent think pair', async () => {
    const leadTops: Record<string, number> = {
      'think-a': 10,
      'think-b': 90,
      'think-c': 170,
    }

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(
      this: HTMLElement,
    ) {
      if (this.getAttribute('data-testid') === 'timeline-think-round') {
        return {
          left: 0,
          top: 0,
          right: 400,
          bottom: 400,
          width: 400,
          height: 400,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      }
      const leadId = this.getAttribute('data-think-lead-id')
      if (leadId && leadTops[leadId] != null) {
        const top = leadTops[leadId]
        return {
          left: 0,
          top,
          right: 20,
          bottom: top + 20,
          width: 20,
          height: 20,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }
      }
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }
    })

    render(
      <ThinkRoundGroup
        items={fixtureItems}
        stepStates={[
          { stepId: 'tool-step-1', type: 'tool', status: 'completed', toolName: 'ReadMemory' },
        ]}
        streamLive={false}
        streamFinished
        messageKey="fixture"
        renderTool={() => (
          <CcToolRow name="ReadMemory" iconName="ReadMemory" phase="已完成" testId="fixture-tool" />
        )}
      />,
    )

    expect(screen.getByTestId('timeline-think-round')).toHaveClass('agent-timeline-think-tree')
    expect(screen.getByTestId('timeline-orchestration-tool').className).toContain(
      'pl-[calc(1.35rem+0.4rem)]',
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('think-rail-segment')).toHaveLength(2)
    })
    const segments = screen.getAllByTestId('think-rail-segment')
    expect(segments[0]).toHaveStyle({ height: '56px' })
    expect(segments[1]).toHaveStyle({ height: '56px' })
  })
})
