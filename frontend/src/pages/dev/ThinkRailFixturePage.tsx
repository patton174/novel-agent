import type { AgentTimelineBlock } from '../../types/agent'
import type { ThinkRoundItem } from '../../utils/agentStreamTimeline'
import { ThinkRoundGroup } from '../../components/agent/timeline/ThinkRoundGroup'
import { CcToolRow } from '../../components/agent/timeline/CcToolRow'

const FIXTURE_ITEMS: ThinkRoundItem[] = [
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'fixture-think-1',
        text: '先读取现有的第5-15章详细细纲。看看完成情况。',
        status: 'done',
      },
    ],
  },
  {
    kind: 'tools',
    blocks: [{ kind: 'tool', id: 'fixture-tool-1', stepId: 'fixture-read-1' }],
  },
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'fixture-think-2',
        text: '继续读取故事大纲。规划第三阶段（第16-30章）细纲。',
        status: 'done',
      },
    ],
  },
  {
    kind: 'tools',
    blocks: [{ kind: 'tool', id: 'fixture-tool-2', stepId: 'fixture-read-2' }],
  },
  {
    kind: 'insight',
    blocks: [
      {
        kind: 'think',
        id: 'fixture-think-3',
        text: '继续完成第三阶段细纲。第16-30章详细内容。',
        status: 'done',
      },
    ],
  },
  {
    kind: 'tools',
    blocks: [{ kind: 'tool', id: 'fixture-tool-3', stepId: 'fixture-edit-1' }],
  },
]

/** E2E 专用：固定编排时间线，验证思考竖线与图标对齐 */
export default function ThinkRailFixturePage() {
  return (
    <main data-testid="think-rail-fixture" className="mx-auto max-w-xl bg-background p-6">
      <ThinkRoundGroup
        items={FIXTURE_ITEMS}
        stepStates={[
          { stepId: 'fixture-read-1', type: 'tool', status: 'completed', toolName: 'ReadMemory', title: '查阅记忆' },
          { stepId: 'fixture-read-2', type: 'tool', status: 'completed', toolName: 'ReadMemory', title: '查阅记忆' },
          { stepId: 'fixture-edit-1', type: 'tool', status: 'failed', toolName: 'EditMemory', title: '编辑记忆' },
        ]}
        streamLive={false}
        streamFinished
        messageKey="fixture"
        renderTool={(block: Extract<AgentTimelineBlock, { kind: 'tool' }>) => (
          <CcToolRow
            name={block.stepId === 'fixture-edit-1' ? 'EditMemory' : 'ReadMemory'}
            iconName={block.stepId === 'fixture-edit-1' ? 'EditMemory' : 'ReadMemory'}
            phase={block.stepId === 'fixture-edit-1' ? '失败' : '已完成'}
            testId={`fixture-tool-${block.id}`}
          />
        )}
      />
    </main>
  )
}
