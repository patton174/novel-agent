import { describe, expect, it } from 'vitest'
import {
  appendTimelineTextDelta,
  applyTimelineEvent,
  appendChoiceSelected,
  deriveOrchestrationHeadline,
  formatPlanningHeadline,
  deriveActivePlanningHeadline,
  extractTrailingDeliveryProseFromTimeline,
  finalizeTimeline,
  groupTimelineUnits,
  groupTimelineDisplayGroups,
  mergePlanningInsightBlocks,
  normalizeTimelineBlockIds,
  orchestrationOverviewFromTimeline,
  pruneEmptyThinkBlocks,
  promoteTrailingNarrationToDelivery,
  shouldRenderThinkBlock,
  shouldShowOrchestrationResumeGap,
  splitPlanningReasoningTailNarration,
  thinkRoundInsightBlocks,
  thinkRoundToolBlocks,
} from './agentStreamTimeline'
import type { AgentStepState } from '../types/agent'

describe('agentStreamTimeline', () => {
  it('interleaves text and tool blocks in order', () => {
    let timeline = appendTimelineTextDelta([], '第一段')
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-choose',
      payload: { name: 'choose' },
    })
    timeline = appendTimelineTextDelta(timeline, '第二段')

    expect(timeline.map((b) => b.kind)).toEqual(['text', 'tool', 'text'])
    expect(timeline[0].kind === 'text' && timeline[0].content).toBe('第一段')
    expect(timeline[2].kind === 'text' && timeline[2].content).toBe('第二段')
  })

  it('does not add timeline tool block for output', () => {
    let timeline = appendTimelineTextDelta([], '正文')
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-output',
      payload: { name: 'output' },
    })
    timeline = appendTimelineTextDelta(timeline, '续写')

    expect(timeline.map((b) => b.kind)).toEqual(['text'])
    expect(timeline[0].kind === 'text' && timeline[0].content).toBe('正文续写')
  })

  it('freezes text before think block', () => {
    const withText = appendTimelineTextDelta([], '正文')
    const timeline = applyTimelineEvent(withText, {
      type: 'think.started',
      step_id: 'step-think',
      payload: {},
    })
    expect(timeline[0].kind === 'text' && timeline[0].frozen).toBe(true)
  })

  it('allows a new reasoning block after the previous plan reasoning completed', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.started',
      step_id: 'step-reason-1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-reason-1',
      payload: { text: '第一轮' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.completed',
      step_id: 'step-reason-1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.started',
      step_id: 'step-reason-2',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-reason-2',
      payload: { text: '第二轮' },
    })
    const reasoning = timeline.filter((b) => b.kind === 'reasoning')
    expect(reasoning).toHaveLength(2)
    expect(reasoning[0].kind === 'reasoning' && reasoning[0].text).toBe('第一轮')
    expect(reasoning[0].kind === 'reasoning' && reasoning[0].status).toBe('done')
    expect(reasoning[1].kind === 'reasoning' && reasoning[1].text).toBe('第二轮')
    expect(reasoning[1].kind === 'reasoning' && reasoning[1].status).toBe('active')
  })

  it('streams reasoning during plan orchestration', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.started',
      step_id: 'step-reason',
      payload: { title: '深度思考' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-reason',
      payload: { text: '编排推理' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.completed',
      step_id: 'step-reason',
      payload: {},
    })
    expect(timeline.some((b) => b.kind === 'reasoning')).toBe(true)
    expect(timeline.find((b) => b.kind === 'reasoning')?.kind === 'reasoning' &&
      timeline.find((b) => b.kind === 'reasoning')?.text).toBe('编排推理')
  })

  it('think step does not require reasoning block', () => {
    let timeline = applyTimelineEvent([], {
      type: 'think.started',
      step_id: 'step-think',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.delta',
      step_id: 'step-think',
      payload: { text: '## 分析' },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['think'])
    expect(timeline.some((b) => b.kind === 'reasoning')).toBe(false)
  })

  it('completes reasoning block on reasoning.completed', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.started',
      step_id: 'step-reason',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.completed',
      step_id: 'step-reason',
      payload: {},
    })
    expect(timeline[0].kind === 'reasoning' && timeline[0].status).toBe('done')
  })

  it('does not duplicate tool blocks with same step_id', () => {
    const started = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-choose',
      payload: { name: 'choose' },
    })
    const again = applyTimelineEvent(started, {
      type: 'tool.started',
      step_id: 'step-choose',
      payload: { name: 'choose' },
    })
    expect(again.filter((b) => b.kind === 'tool')).toHaveLength(1)
  })

  it('adds planning.next_step transition block', () => {
    const withThink = applyTimelineEvent([], {
      type: 'think.completed',
      step_id: 'step-think',
      payload: {},
    })
    const timeline = applyTimelineEvent(withThink, {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '规划中…' },
    })
    expect(timeline.some((b) => b.kind === 'transition')).toBe(true)
    const transition = timeline.find((b) => b.kind === 'transition')
    expect(transition?.kind === 'transition' && transition.status).toBe('active')
  })

  it('assigns unique block ids when run-level step_id is reused', () => {
    const runStepId = 'step_run_297c52ed-518e-4044-be98-e112629bfc1a'
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: runStepId,
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step_tool_abc',
      payload: { name: 'think' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: runStepId,
      payload: { next_tool: 'output' },
    })
    const ids = timeline.map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('normalizeTimelineBlockIds repairs legacy duplicate ids', () => {
    const runStepId = 'step_run_297c52ed-518e-4044-be98-e112629bfc1a'
    const legacy = [
      { kind: 'transition' as const, id: runStepId, title: '规划', status: 'done' as const },
      { kind: 'transition' as const, id: runStepId, title: '下一步', status: 'active' as const },
      { kind: 'tool' as const, id: runStepId, stepId: 'step_tool_abc' },
    ]
    const normalized = normalizeTimelineBlockIds(legacy)
    const ids = normalized.map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id !== runStepId || ids.filter((x) => x === runStepId).length <= 1)).toBe(
      true,
    )
  })

  it('keeps think tool in primary segment; planning only shows reasoning', () => {
    let timeline = applyTimelineEvent([], {
      type: 'think.started',
      step_id: 'step-think',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.delta',
      step_id: 'step-think',
      payload: { text: '分析意图' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.completed',
      step_id: 'step-think',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.started',
      step_id: 'step-reason',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-reason',
      payload: { text: '编排推理' },
    })
    const units = groupTimelineUnits(timeline)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('orchestration')
    if (units[0].kind === 'orchestration') {
      expect(units[0].rounds).toHaveLength(2)
      expect(thinkRoundInsightBlocks(units[0].rounds[0]).map((b) => b.kind)).toEqual(['think'])
      expect(thinkRoundToolBlocks(units[0].rounds[0])).toHaveLength(0)
      expect(thinkRoundInsightBlocks(units[0].rounds[1]).map((b) => b.kind)).toEqual(['reasoning'])
      const insight = mergePlanningInsightBlocks(thinkRoundInsightBlocks(units[0].rounds[1]))
      expect(insight.text).toContain('编排推理')
      expect(insight.text).not.toContain('分析意图')
    }
  })

  it('does not move think into planning when think still active', () => {
    let timeline = applyTimelineEvent([], {
      type: 'think.started',
      step_id: 'step-think',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.delta',
      step_id: 'step-think',
      payload: { text: 'think 工具内容' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    const units = groupTimelineUnits(timeline)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('orchestration')
    if (units[0].kind === 'orchestration') {
      expect(thinkRoundInsightBlocks(units[0].rounds[0]).map((b) => b.kind)).toEqual(['think'])
    }
  })

  it('starts a new think round after tools instead of reopening an earlier think block', () => {
    let timeline = applyTimelineEvent([], {
      type: 'think.started',
      step_id: 'step-think-1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.delta',
      step_id: 'step-think-1',
      payload: { text: '首轮思考' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.completed',
      step_id: 'step-think-1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'step.started',
      step_id: 'step-list',
      payload: { tool: 'ListChapters' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'think.delta',
      step_id: 'step-think-2',
      payload: { text: '工具前思考' },
    })

    const thinkBlocks = timeline.filter(
      (block): block is Extract<typeof block, { kind: 'think' }> => block.kind === 'think',
    )
    expect(thinkBlocks).toHaveLength(2)
    expect(thinkBlocks[0]?.text).toContain('首轮思考')
    expect(thinkBlocks[1]?.text).toContain('工具前思考')

    const toolIdx = timeline.findIndex((block) => block.kind === 'tool')
    const secondThinkIdx = timeline.findIndex(
      (block) => block.kind === 'think' && block.text.includes('工具前思考'),
    )
    expect(toolIdx).toBeGreaterThanOrEqual(0)
    expect(secondThinkIdx).toBeGreaterThan(toolIdx)

    const units = groupTimelineUnits(timeline, [
      {
        stepId: 'step-list',
        toolName: 'ListChapters',
        title: '列举章节',
        status: 'completed',
      },
    ])
    const orch = units.find((unit) => unit.kind === 'orchestration')
    expect(orch?.kind).toBe('orchestration')
    if (orch?.kind === 'orchestration') {
      const roundItems = orch.rounds.flatMap((round) => round.items.map((item) => item.kind))
      const insightIdx = roundItems.indexOf('insight')
      const toolsIdx = roundItems.indexOf('tools')
      expect(insightIdx).toBeGreaterThanOrEqual(0)
      expect(toolsIdx).toBeGreaterThan(insightIdx)
    }
  })

  it('flattens CC orchestration transition children into orchestration layer', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.started',
      step_id: 'step-reason',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-tool',
      payload: { name: 'choose' },
    })
    const units = groupTimelineUnits(timeline)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('orchestration')
    if (units[0].kind === 'orchestration') {
      expect(thinkRoundInsightBlocks(units[0].rounds[0]).map((b) => b.kind)).toEqual(['reasoning'])
      expect(thinkRoundToolBlocks(units[0].rounds[0]).map((b) => b.kind)).toEqual(['tool'])
    }
  })

  it('opens a new planning round after planning.completed', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan-1',
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-tool-1',
      payload: { name: 'memory_update' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan-done',
      payload: { next_tool: 'output' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.next_step',
      step_id: 'step-plan-2',
      payload: { title: '读取记忆' },
    })
    const transitions = timeline.filter((b) => b.kind === 'transition')
    expect(transitions).toHaveLength(2)
    expect(transitions[0].kind === 'transition' && transitions[0].status).toBe('done')
    expect(transitions[1].kind === 'transition' && transitions[1].status).toBe('active')
    expect(transitions[1].kind === 'transition' && transitions[1].title).toBe('读取记忆')
    const units = groupTimelineUnits(timeline)
    const orchLayers = units.filter((u) => u.kind === 'orchestration')
    expect(orchLayers.length).toBeGreaterThanOrEqual(1)
    const lastOrch = orchLayers[orchLayers.length - 1]
    if (lastOrch?.kind === 'orchestration') {
      const tools = lastOrch.rounds.flatMap((r) => thinkRoundToolBlocks(r))
      expect(tools.map((b) => b.kind)).toEqual(['tool'])
    }
  })

  it('closes planning transition after planning.completed', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan-done',
      payload: { next_tool: 'choose', title: '准备创作方向' },
    })
    const transition = timeline.find((b) => b.kind === 'transition')
    expect(transition?.kind === 'transition' && transition.status).toBe('done')
    expect(transition?.kind === 'transition' && transition.title).toBe('准备创作方向')
  })

  it('appends planned tools after in-round streaming blocks', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.started',
      step_id: 'step-plan',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-plan',
      payload: { text: '分析章节结构' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan',
      payload: {
        tool_calls: [{ tool: 'ReadMemory', tool_call_id: 'call_mem' }],
      },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['transition', 'reasoning', 'tool'])
  })

  it('adds tool block on step.started for chapter tools', () => {
    const timeline = applyTimelineEvent([], {
      type: 'step.started',
      step_id: 'step-ch-1',
      payload: { tool: 'chapter_list' },
    })
    expect(timeline.some((b) => b.kind === 'tool' && b.stepId === 'step-ch-1')).toBe(true)
  })

  it('derives batch headline from planning.completed partition', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan',
      payload: {
        title: '编排中…',
        tool_calls: [
          { tool: 'Glob', tool_call_id: 'call_glob' },
          { tool: 'Write', tool_call_id: 'call_write' },
        ],
        partition: [
          { parallel: false, tools: ['Glob'] },
          { parallel: false, tools: ['Write'] },
        ],
      },
    })
    const transition = timeline.find((b) => b.kind === 'transition')
    expect(transition?.kind === 'transition' && transition.title).toBe('列举 → 写入')
    expect(timeline.some((b) => b.kind === 'tool' && b.stepId === 'call_glob')).toBe(true)
    expect(timeline.some((b) => b.kind === 'tool' && b.stepId === 'call_write')).toBe(true)
  })

  it('shows orchestration overview beside done headline', () => {
    const headline = deriveOrchestrationHeadline([], [], false, true, 'done', '列举 → 写入')
    expect(headline).toBe('编排完成 · 列举 → 写入')
  })

  it('deriveOrchestrationHeadline follows active tool while streaming', () => {
    const rounds = [
      {
        items: [
          {
            kind: 'tools' as const,
            blocks: [{ kind: 'tool' as const, id: 'tool-1', stepId: 'step-read' }],
          },
        ],
      },
    ]
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-read',
        type: 'tool',
        toolName: 'ReadChapter',
        status: 'started',
      },
    ]
    expect(
      deriveOrchestrationHeadline(rounds, stepStates, true, false, 'active'),
    ).toBe('阅读章节…')
    expect(
      deriveOrchestrationHeadline(rounds, stepStates, true, false, 'done'),
    ).toBe('阅读章节…')
  })

  it('deriveOrchestrationHeadline shows think label before tools start', () => {
    const rounds = [
      {
        items: [
          {
            kind: 'insight' as const,
            blocks: [
              { kind: 'reasoning' as const, id: 'r1', text: '分析', status: 'active' as const },
            ],
          },
        ],
      },
    ]
    expect(deriveOrchestrationHeadline(rounds, [], true, false, 'active')).toBe('思考中…')
  })

  it('reads orchestration overview from done transition title', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan',
      payload: {
        tool_calls: [{ tool: 'Write', tool_call_id: 'call_w' }],
        partition: [{ parallel: false, tools: ['Write'] }],
      },
    })
    expect(orchestrationOverviewFromTimeline(timeline)).toBe('写入')
  })

  it('formatPlanningHeadline avoids duplicate 编排完成 + 规划中', () => {
    const done = formatPlanningHeadline(
      { kind: 'transition', id: 't1', title: '准备创作方向', status: 'done' },
      false,
      true,
    )
    expect(done).toBe('准备创作方向')
    const active = formatPlanningHeadline(
      { kind: 'transition', id: 't2', title: '规划中…', status: 'active' },
      true,
      false,
    )
    expect(active).toBe('编排中…')
    const emptyActive = formatPlanningHeadline(
      { kind: 'transition', id: 't3', title: '', status: 'active' },
      true,
      false,
    )
    expect(emptyActive).toBe('编排中…')
  })

  it('ignores think.transition blocks', () => {
    const withThink = applyTimelineEvent([], {
      type: 'think.started',
      step_id: 'step-think',
      payload: {},
    })
    const timeline = applyTimelineEvent(withThink, {
      type: 'think.transition',
      step_id: 'step-transition',
      payload: { title: '正在思考下一步' },
    })
    expect(timeline.some((b) => b.kind === 'transition')).toBe(false)
  })

  it('records choice selection block', () => {
    const timeline = appendChoiceSelected([], {
      id: '1',
      title: '开篇入局',
      description: '从主角进入游戏世界写起',
    })
    expect(timeline).toHaveLength(1)
    expect(timeline[0].kind).toBe('choice_selected')
    if (timeline[0].kind === 'choice_selected') {
      expect(timeline[0].title).toBe('开篇入局')
    }
  })

  it('groups reasoning and tools into orchestration layer', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.started',
      step_id: 'step-r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-t1',
      payload: { name: 'Glob' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-t2',
      payload: { name: 'Read' },
    })
    const units = groupTimelineUnits(timeline)
    const orch = units.find((u) => u.kind === 'orchestration')
    expect(orch?.kind).toBe('orchestration')
    if (orch?.kind === 'orchestration') {
      expect(
        thinkRoundInsightBlocks(orch.rounds[0]).some((b) => b.kind === 'reasoning'),
      ).toBe(true)
      expect(thinkRoundToolBlocks(orch.rounds[0])).toHaveLength(2)
    }
  })

  it('keeps choose/AskUser lone tool outside orchestration', () => {
    const timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-choose',
      payload: { name: 'choose' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-choose',
        type: 'tool',
        status: 'completed',
        title: '生成创作方向',
        toolName: 'choose',
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('segment')
    if (units[0].kind === 'segment') {
      expect(units[0].blocks.map((b) => b.kind)).toEqual(['tool'])
    }
  })

  it('promotes trailing narration after last tool outside orchestration when stream finished', () => {
    let timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-mem',
      payload: { name: 'Glob' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '章节正文' },
    })
    const units = groupTimelineUnits(timeline, undefined, { streamFinished: true })
    const orch = units.find((u) => u.kind === 'orchestration')
    const delivery = units.find(
      (u) =>
        u.kind === 'segment' &&
        u.blocks.some((b) => b.kind === 'narration' && b.content.includes('章节正文')),
    )
    expect(orch?.kind).toBe('orchestration')
    if (orch?.kind === 'orchestration') {
      expect(orch.status).toBe('done')
      const narrBlocks = orch.rounds.flatMap((round) =>
        round.items
          .filter((item) => item.kind === 'narration')
          .flatMap((item) => item.blocks),
      )
      expect(narrBlocks.some((b) => b.content.includes('章节正文'))).toBe(false)
    }
    expect(delivery?.kind).toBe('segment')
  })

  it('keeps trailing text inside orchestration while stream is still live', () => {
    let timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-mem',
      payload: { name: 'Glob' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'message.delta',
      step_id: 'step-out',
      payload: { text: '流式正文' },
    })
    const units = groupTimelineUnits(timeline, undefined, { streamFinished: false })
    const orch = units.find((u) => u.kind === 'orchestration')
    expect(orch?.kind).toBe('orchestration')
    if (orch?.kind === 'orchestration') {
      const textBlocks = orch.rounds.flatMap((round) =>
        round.items
          .filter((item) => item.kind === 'text')
          .flatMap((item) => item.blocks),
      )
      expect(textBlocks.some((b) => b.content.includes('流式正文'))).toBe(true)
    }
    expect(units.some((u) => u.kind === 'segment')).toBe(false)
  })

  it('coalesces mid-flow narrations into one orchestration when stream finished', () => {
    let timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-1',
      payload: { name: 'ReadMemory' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n1',
      payload: { text: '继续优化章节规划部分的记忆节点' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.next_step',
      step_id: 'step-plan-2',
      payload: { title: '编排中' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n2',
      payload: { text: '继续更新剩余的记忆节点' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-2',
      payload: { name: 'UpdateMemory' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n3',
      payload: { text: '记忆条目优化已完成' },
    })
    const units = groupTimelineUnits(timeline, undefined, { streamFinished: true })
    const orchUnits = units.filter((u) => u.kind === 'orchestration')
    expect(orchUnits).toHaveLength(1)
    const delivery = units.find(
      (u) =>
        u.kind === 'segment' &&
        u.blocks.some((b) => b.kind === 'narration' && b.content.includes('记忆条目优化已完成')),
    )
    expect(delivery?.kind).toBe('segment')
    if (orchUnits[0]?.kind === 'orchestration') {
      const narrBlocks = orchUnits[0].rounds.flatMap((round) =>
        round.items
          .filter((item) => item.kind === 'narration')
          .flatMap((item) => item.blocks),
      )
      expect(narrBlocks.some((b) => b.content.includes('继续优化章节规划'))).toBe(true)
      expect(narrBlocks.some((b) => b.content.includes('记忆条目优化已完成'))).toBe(false)
    }
  })

  it('merges think and reasoning inside planning insight', () => {
    const merged = mergePlanningInsightBlocks([
      { kind: 'think', id: 't1', text: '分析', status: 'done' },
      { kind: 'reasoning', id: 'r1', text: '规划推理', status: 'done' },
    ])
    expect(merged.text).toContain('分析')
    expect(merged.text).toContain('规划推理')
    expect(merged.isActive).toBe(false)
  })

  it('appends narration.delta during planning as narration block', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '你好，' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '世界' },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['transition', 'narration'])
    const narration = timeline.find((b) => b.kind === 'narration')
    expect(narration && narration.kind === 'narration' ? narration.content : '').toBe('你好，世界')
  })

  it('removes provisional narration block on narration.withdraw', () => {
    let timeline = applyTimelineEvent([], {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '你好，世界' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.withdraw',
      step_id: 'step-out',
      payload: { reason: 'terminal_delivery' },
    })
    expect(timeline).toEqual([])
  })

  it('extractTrailingDeliveryProseFromTimeline ignores mid-orchestration narration', () => {
    let timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-1',
      payload: { name: 'ReadMemory' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n1',
      payload: { text: '继续优化记忆节点' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-2',
      payload: { name: 'UpdateMemory' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n2',
      payload: { text: '记忆优化完成，详见下表。' },
    })
    expect(extractTrailingDeliveryProseFromTimeline(timeline)).toBe('记忆优化完成，详见下表。')
  })

  it('promoteTrailingNarrationToDelivery moves tail narration after last tool to messageContent', () => {
    let timeline = applyTimelineEvent([], {
      type: 'narration.delta',
      step_id: 'step-a',
      payload: { text: '先说明进度。' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.completed',
      step_id: 'tool-1',
      payload: { name: 'ReadMemory' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-b',
      payload: { text: '最终答复。' },
    })

    const promoted = promoteTrailingNarrationToDelivery(timeline, '')
    expect(promoted.messageContent).toBe('最终答复。')
    expect(promoted.timeline.some((b) => b.kind === 'narration' && b.content.includes('先说明'))).toBe(
      true,
    )
    expect(promoted.timeline.some((b) => b.kind === 'narration' && b.content.includes('最终'))).toBe(
      false,
    )
  })

  it('promoteTrailingNarrationToDelivery skips when messageContent already set', () => {
    const timeline = applyTimelineEvent([], {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '不应覆盖' },
    })
    const promoted = promoteTrailingNarrationToDelivery(timeline, '[交付] 已有正文')
    expect(promoted.messageContent).toBe('[交付] 已有正文')
    expect(promoted.timeline).toEqual(timeline)
  })

  it('appends message.delta to timeline for chronological interleaving', () => {
    const timeline = applyTimelineEvent([], {
      type: 'message.delta',
      step_id: 'step-out',
      payload: { text: '最终回复' },
    })
    expect(timeline).toEqual([
      expect.objectContaining({ kind: 'text', content: '最终回复' }),
    ])
  })

  it('interleaves message.delta with tools on timeline', () => {
    let timeline = applyTimelineEvent([], {
      type: 'message.delta',
      step_id: 'step-out',
      payload: { text: '编排说明' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-read',
      payload: { name: 'ReadChapter' },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['text', 'tool'])
    expect(timeline[0].kind === 'text' && timeline[0].frozen).toBe(true)
    timeline = applyTimelineEvent(timeline, {
      type: 'message.delta',
      step_id: 'step-out',
      payload: { text: '交付正文' },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['text', 'tool', 'text'])
    expect(timeline[2].kind === 'text' && timeline[2].content).toBe('交付正文')
  })

  it('appends message.delta after planning transition on timeline', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'message.delta',
      step_id: 'step-out',
      payload: { text: '可见正文' },
    })
    expect(timeline.map((b) => b.kind)).toEqual(['transition', 'text'])
  })

  it('extracts legacy delivery text from planning children as top-level segment', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'step-reason',
      payload: { text: '内省推理' },
    })
    timeline = [
      ...timeline,
      { kind: 'text' as const, id: 'text-legacy', content: '你好！', frozen: false },
    ]
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.completed',
      step_id: 'step-plan',
      payload: { next_tool: 'end', reason: 'no tool_use' },
    })
    const units = groupTimelineUnits(timeline, undefined, { streamFinished: true })
    const orch = units.find((u) => u.kind === 'orchestration')
    const textUnit = units.find(
      (u) => u.kind === 'segment' && u.blocks.some((b) => b.kind === 'text'),
    )
    expect(orch?.kind).toBe('orchestration')
    if (orch?.kind === 'orchestration') {
      const hasText = orch.rounds.some((r) => r.items.some((i) => i.kind === 'text'))
      expect(hasText).toBe(false)
    }
    expect(textUnit?.kind).toBe('segment')
  })

  it('promotes trailing narration outside orchestration after tool execution when finished', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '查阅创作记忆' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-mem',
      payload: { name: 'memory_read' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '角色库优化建议' },
    })
    const units = groupTimelineUnits(timeline, undefined, { streamFinished: true })
    expect(units.some((u) => u.kind === 'orchestration')).toBe(true)
    const delivery = units.find(
      (u) =>
        u.kind === 'segment' &&
        u.blocks.some((b) => b.kind === 'narration' && b.content.includes('角色库优化建议')),
    )
    expect(delivery?.kind).toBe('segment')
  })

  it('keeps ask_user interaction outside planning unit', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '规划中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'ask_user' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '整理待确认问题',
        toolName: 'ask_user',
        interaction: {
          type: 'ask_user',
          questions: [{ id: 'q1', prompt: '优先优化哪块？', type: 'single_select', options: [] }],
        },
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('segment')
    if (units[0].kind === 'segment') {
      expect(units[0].blocks.map((b) => b.kind)).toEqual(['tool'])
    }
  })

  it('keeps AskUser choose outside orchestration when mixed with narration', () => {
    let timeline = applyTimelineEvent([], {
      type: 'narration.delta',
      step_id: 'step-out',
      payload: { text: '请确认创作方向：' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '询问',
        toolName: 'AskUser',
        interaction: {
          type: 'single_select',
          options: [{ id: 'a', title: '科幻' }],
        },
        choices: [{ id: 'a', title: '科幻' }],
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates, { streamFinished: true })
    const kinds = units.map((u) => u.kind)
    expect(kinds).toContain('segment')
    expect(kinds).not.toEqual(['orchestration'])
    const askSegment = units.find((u) => u.kind === 'segment')
    expect(askSegment && askSegment.kind === 'segment' && askSegment.blocks[0].kind).toBe('tool')
    const orch = units.find((u) => u.kind === 'orchestration')
    if (orch && orch.kind === 'orchestration') {
      const toolBlocks = orch.rounds.flatMap((r) =>
        r.items.filter((i) => i.kind === 'tools').flatMap((i) => i.blocks),
      )
      expect(toolBlocks).toHaveLength(0)
    }
  })

  it('keeps AskUser outside orchestration while tool is still starting', () => {
    const timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'started',
        title: '询问',
        toolName: 'AskUser',
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates)
    expect(units).toHaveLength(1)
    expect(units[0].kind).toBe('segment')
  })

  it('marks orchestration before AskUser segment as done', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.completed',
      step_id: 'step-r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-read',
      payload: { name: 'Read' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-read',
        type: 'tool',
        status: 'completed',
        toolName: 'Read',
      },
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '询问',
        toolName: 'AskUser',
        interaction: {
          type: 'ask_user',
          questions: [{ id: 'q1', prompt: '如何续写？', type: 'input' }],
        },
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates)
    const askIdx = units.findIndex(
      (u) =>
        u.kind === 'segment' &&
        u.blocks.some((b) => b.kind === 'tool' && b.stepId === 'step-ask'),
    )
    expect(askIdx).toBeGreaterThan(0)
    const orchBefore = units
      .slice(0, askIdx)
      .filter((u): u is Extract<(typeof units)[number], { kind: 'orchestration' }> => u.kind === 'orchestration')
    expect(orchBefore.length).toBeGreaterThan(0)
    expect(orchBefore.every((u) => u.status === 'done')).toBe(true)
  })

  it('shows orchestration resume gap after answered AskUser before new SSE', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.completed',
      step_id: 'step-r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-read',
      payload: { name: 'Read' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-read',
        type: 'tool',
        status: 'completed',
        toolName: 'Read',
      },
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '询问',
        toolName: 'AskUser',
        interaction: {
          type: 'ask_user',
          questions: [{ id: 'q1', prompt: '如何续写？', type: 'input' }],
        },
      },
    ]
    timeline = appendChoiceSelected(timeline, { id: 'a1', title: '按大纲续写' }, 'step-ask')
    const units = groupTimelineUnits(timeline, stepStates)
    expect(
      shouldShowOrchestrationResumeGap({
        timelineUnits: units,
        timeline,
        stepStates,
        streamLive: true,
        streamFinished: false,
        awaitingInteraction: false,
      }),
    ).toBe(true)
  })

  it('hides orchestration resume gap once post-interaction blocks arrive', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.completed',
      step_id: 'step-r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    timeline = appendChoiceSelected(timeline, { id: 'a1', title: '按大纲续写' }, 'step-ask')
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.completed',
      step_id: 'step-r2',
      payload: {},
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '询问',
        toolName: 'AskUser',
        interaction: {
          type: 'ask_user',
          questions: [{ id: 'q1', prompt: '如何续写？', type: 'input' }],
        },
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates)
    expect(
      shouldShowOrchestrationResumeGap({
        timelineUnits: units,
        timeline,
        stepStates,
        streamLive: true,
        streamFinished: false,
        awaitingInteraction: false,
      }),
    ).toBe(false)
  })

  it('promotes AskUser out of coalesced orchestration rounds', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.completed',
      step_id: 'step-r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'narration.delta',
      step_id: 'step-n1',
      payload: { text: '步骤 4：AskUser 询问续写偏好' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'tool.started',
      step_id: 'step-ask',
      payload: { name: 'AskUser' },
    })
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-ask',
        type: 'tool',
        status: 'completed',
        title: '询问',
        toolName: 'AskUser',
        interaction: {
          type: 'ask_user',
          questions: [{ id: 'q1', prompt: '如何续写？', type: 'input' }],
        },
      },
    ]
    const units = groupTimelineUnits(timeline, stepStates, { streamFinished: true })
    const askSegments = units.filter(
      (u) =>
        u.kind === 'segment' &&
        u.blocks.some((b) => b.kind === 'tool' && b.stepId === 'step-ask'),
    )
    expect(askSegments.length).toBeGreaterThan(0)
    const orch = units.find((u) => u.kind === 'orchestration')
    if (orch && orch.kind === 'orchestration') {
      const nestedAsk = orch.rounds.flatMap((r) =>
        r.items
          .filter((i) => i.kind === 'tools')
          .flatMap((i) => i.blocks)
          .filter((b) => b.stepId === 'step-ask'),
      )
      expect(nestedAsk).toHaveLength(0)
    }
  })

  it('ignores planning.invoking for transition headline', () => {
    let timeline = applyTimelineEvent([], {
      type: 'planning.next_step',
      step_id: 'step-plan',
      payload: { title: '编排中…' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'planning.invoking',
      step_id: 'step-plan',
      payload: { message: '正在调用编排模型' },
    })
    const transition = timeline.find((b) => b.kind === 'transition')
    expect(transition?.kind === 'transition' && transition.title).toBe('编排中…')
  })

  it('drops plan reasoning placeholder deltas', () => {
    let timeline = applyTimelineEvent([], {
      type: 'reasoning.started',
      step_id: 'r1',
      payload: {},
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'r1',
      payload: { text: '正在调用编排模型…\n' },
    })
    timeline = applyTimelineEvent(timeline, {
      type: 'reasoning.delta',
      step_id: 'r1',
      payload: { text: '真实推理内容' },
    })
    const reasoning = timeline.find((b) => b.kind === 'reasoning')
    expect(reasoning?.kind === 'reasoning' && reasoning.text).toBe('真实推理内容')
  })

  it('deriveActivePlanningHeadline switches to think/memory labels while active', () => {
    const transition = {
      kind: 'transition' as const,
      id: 'tr1',
      title: '规划中…',
      status: 'active' as const,
    }
    const stepStates: AgentStepState[] = [
      {
        stepId: 'step-read',
        toolName: 'memory_read',
        title: '读取世界观 · worldview',
        status: 'started',
      },
    ]
    expect(
      deriveActivePlanningHeadline(
        transition,
        [{ kind: 'tool', id: 'tool-1', stepId: 'step-read' }],
        stepStates,
        true,
        false,
      ),
    ).toBe('读取世界观 · worldview…')
    expect(
      deriveActivePlanningHeadline(
        transition,
        [{ kind: 'reasoning', id: 'r1', text: '编排推理', status: 'active' }],
        stepStates,
        true,
        false,
      ),
    ).toBe('思考中…')
  })

  it('hides placeholder and empty completed think blocks', () => {
    expect(
      shouldRenderThinkBlock({
        kind: 'think',
        id: 'think-pending',
        text: '',
        status: 'active',
      }),
    ).toBe(false)
    expect(
      shouldRenderThinkBlock({
        kind: 'think',
        id: 'think:step-1',
        text: '',
        status: 'done',
      }),
    ).toBe(false)
    expect(
      shouldRenderThinkBlock(
        {
          kind: 'think',
          id: 'think:step-1',
          text: '',
          status: 'active',
        },
        { streamLive: true, streamFinished: false },
      ),
    ).toBe(true)
    expect(
      shouldRenderThinkBlock(
        {
          kind: 'think',
          id: 'think:step-1',
          text: '分析意图',
          status: 'done',
        },
        { streamLive: false, streamFinished: true },
      ),
    ).toBe(true)
    expect(
      shouldRenderThinkBlock(
        {
          kind: 'think',
          id: 'think:step-1',
          text: 'x'.repeat(700),
          status: 'done',
        },
        { streamLive: false, streamFinished: true },
      ),
    ).toBe(true)
    const finalized = finalizeTimeline([
      { kind: 'think', id: 'think-pending', text: '', status: 'active' },
      {
        kind: 'think',
        id: 'think:step-1',
        text: '保留',
        status: 'active',
      },
      { kind: 'think', id: 'think:step-2', text: '', status: 'active' },
    ])
    expect(pruneEmptyThinkBlocks(finalized).map((b) => b.id)).toEqual(['think:step-1'])
  })

  it('does not mark planning insight active for empty think blocks', () => {
    const insight = mergePlanningInsightBlocks([
      { kind: 'think', id: 't1', text: '', status: 'active' },
      { kind: 'reasoning', id: 'r1', text: '规划推理', status: 'done' },
    ])
    expect(insight.isActive).toBe(false)
    expect(insight.text).toBe('规划推理')
  })

  it('inserts choice_selected after the matching tool step', () => {
    let timeline = applyTimelineEvent([], {
      type: 'tool.started',
      step_id: 'step-choose',
      payload: { name: 'choose' },
    })
    timeline = appendChoiceSelected(
      timeline,
      { id: 'a', title: '方向 A' },
      'step-choose',
    )
    expect(timeline.map((b) => b.kind)).toEqual(['tool', 'choice_selected'])
    if (timeline[1].kind === 'choice_selected') {
      expect(timeline[1].stepId).toBe('step-choose')
    }
  })

  it('splits trailing action narration from planning reasoning', () => {
    const reasoning = [
      '用户要求测试子代理：',
      '1. 派发子代理',
      '2. 汇报结果',
      '',
      '让我先创建一个 todo 列表，然后派发子代理。',
    ].join('\n')
    const split = splitPlanningReasoningTailNarration(reasoning)
    expect(split.narration).toBe('让我先创建一个 todo 列表，然后派发子代理。')
    expect(split.insight).toContain('用户要求测试子代理')
    expect(split.insight).not.toContain('让我先创建')
  })

  it('merges consecutive meta units for one timeline rail', () => {
    const groups = groupTimelineDisplayGroups([
      {
        kind: 'orchestration',
        id: 'orch:0',
        status: 'done',
        rounds: [{ insight: [], tools: [{ kind: 'tool', id: 't1', stepId: 's1' }] }],
      },
      {
        kind: 'orchestration',
        id: 'orch:1',
        status: 'done',
        rounds: [{ insight: [], tools: [{ kind: 'tool', id: 't2', stepId: 's2' }] }],
      },
      {
        kind: 'segment',
        blocks: [{ kind: 'text', id: 'txt1', content: '正文段落' }],
      },
      {
        kind: 'segment',
        blocks: [{ kind: 'think', id: 'th1', text: '收尾思考', status: 'done' }],
      },
    ])
    expect(groups).toHaveLength(3)
    expect(groups[0].kind).toBe('meta')
    if (groups[0].kind === 'meta') {
      expect(groups[0].units).toHaveLength(2)
    }
    expect(groups[1].kind).toBe('text')
    expect(groups[2].kind).toBe('meta')
  })

  it('splits mixed segment so text breaks meta rail', () => {
    const groups = groupTimelineDisplayGroups([
      {
        kind: 'segment',
        blocks: [
          { kind: 'tool', id: 't1', stepId: 's1' },
          { kind: 'text', id: 'txt1', content: '正文段落' },
          { kind: 'tool', id: 't2', stepId: 's2' },
        ],
      },
    ])
    expect(groups.map((g) => g.kind)).toEqual(['meta', 'text', 'meta'])
    if (groups[1].kind === 'text') {
      expect(groups[1].blocks[0].content).toBe('正文段落')
    }
  })

  it('inserts parent tool block on subagent.started', () => {
    const timeline = applyTimelineEvent([], {
      type: 'subagent.started',
      step_id: 'agent-step',
      payload: { parent_step_id: 'agent-step', description: '校验角色' },
    })
    expect(timeline.some((b) => b.kind === 'tool' && b.stepId === 'agent-step')).toBe(true)
  })

  it('groups narration and agent tool into one orchestration unit', () => {
    const units = groupTimelineUnits([
      { kind: 'narration', id: 'txt1', content: '正文', frozen: false },
      { kind: 'tool', id: 'agent1', stepId: 'agent-step' },
    ])
    expect(units.map((unit) => unit.kind)).toEqual(['orchestration'])
    const agentUnit = units[0]
    expect(agentUnit?.kind).toBe('orchestration')
    if (agentUnit?.kind === 'orchestration') {
      const tools = agentUnit.rounds.flatMap((round) => thinkRoundToolBlocks(round))
      expect(tools[0]?.stepId).toBe('agent-step')
      const narrBlocks = agentUnit.rounds.flatMap((round) =>
        round.items
          .filter((item) => item.kind === 'narration')
          .flatMap((item) => item.blocks),
      )
      expect(narrBlocks[0]?.content).toBe('正文')
    }
  })
})
