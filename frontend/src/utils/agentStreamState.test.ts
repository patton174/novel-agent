import { describe, expect, it } from 'vitest'
import {
  applyAgentEvent,
  createInitialAgentStreamUiState,
  finalizeAgentMessageContent,
} from './agentStreamState'
import { deriveAssistantStreamPhase } from './agentStreamPhase'
import { parseSseFrame, splitSseBuffer } from './sse'

describe('splitSseBuffer', () => {
  it('preserves incomplete trailing frame in remainder', () => {
    const chunk =
      'event: agent-event\ndata: {"type":"think.delta"}\n\n' +
      'event: stream-end\ndata: do'
    const { frames, remainder } = splitSseBuffer(chunk)

    expect(frames).toHaveLength(1)
    expect(frames[0]).toContain('think.delta')
    expect(remainder).toBe('event: stream-end\ndata: do')
  })

  it('parses a complete frame after buffer fills', () => {
    let buffer = 'event: stream-end\ndata: do'
    const first = splitSseBuffer(buffer)
    expect(first.frames).toHaveLength(0)

    buffer = first.remainder + 'ne\n\n'
    const second = splitSseBuffer(buffer)
    expect(second.frames).toHaveLength(1)
    expect(parseSseFrame(second.frames[0])).toEqual({
      event: 'stream-end',
      data: 'done',
    })
  })
})

describe('applyAgentEvent', () => {
  it('concatenates think.delta chunks without forced newlines', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'think.delta', payload: { text: '正在' } }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'think.delta', payload: { text: '分析用户的写作意图' } }),
    )

    const thinkBlock = state.timeline.find((b) => b.kind === 'think')
    expect(thinkBlock?.kind === 'think' && thinkBlock.text).toBe('正在分析用户的写作意图')
    expect(state.thinkText).toBe('')
  })

  it('ignores non-tool lifecycle events in stepStates', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'think.completed', step_id: 's1', payload: {} }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'message.completed', step_id: 's2', payload: {} }),
    )

    expect(state.stepStates).toHaveLength(0)
  })

  it('merges tool.started, tool.progress and tool.completed with the same step_id', () => {
    let state = createInitialAgentStreamUiState()
    const sid = 'step_write_1'
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: sid,
        payload: { name: 'output', display_name: '回复说明' },
      }),
    )
    expect(state.stepStates).toHaveLength(1)
    expect(state.stepStates[0].status).toBe('started')
    expect(state.activeToolCount).toBe(1)

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.progress',
        step_id: sid,
        payload: { name: 'output', display_name: '回复说明', message: '正在生成正文...' },
      }),
    )
    expect(state.stepStates).toHaveLength(1)
    expect(state.stepStates[0].detail).toContain('正在生成')

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: sid,
        payload: { name: 'output', display_name: '回复说明', status: 'ok', output: '完成' },
      }),
    )
    expect(state.stepStates).toHaveLength(1)
    expect(state.stepStates[0].status).toBe('completed')
    expect(state.activeToolCount).toBe(0)
  })

  it('maps tool events with Chinese display name', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: 'step-tool',
        payload: { name: 'choose', display_name: '生成创作方向' },
      }),
    )

    expect(state.stepStates).toHaveLength(1)
    expect(state.stepStates[0].title).toBe('生成创作方向')
    expect(state.stepStates[0].status).toBe('started')
    expect(state.activeToolCount).toBe(1)
  })

  it('parses choose choices on tool.completed', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-tool',
        payload: {
          name: 'choose',
          display_name: '生成创作方向',
          choices: [
            { id: 'opt-1', title: '科幻未来', description: '高科技世界观' },
          ],
        },
      }),
    )

    expect(state.stepStates[0].choices).toHaveLength(1)
    expect(state.stepStates[0].choices![0].title).toBe('科幻未来')
  })

  it('sets awaitingInteraction on run.waiting', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'run.waiting', payload: { reason: 'waiting for user interaction' } }),
    )
    expect(state.awaitingInteraction).toBe(true)
    expect(state.runTerminalAck).toBe(true)
    expect(state.isStreamEnded).toBe(true)
    expect(deriveAssistantStreamPhase(state)).toBe('waiting')
  })

  it('keeps waiting phase after stream-end when ask_user paused the run', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'run.waiting', payload: { reason: 'waiting for user interaction' } }),
    )
    state = applyAgentEvent(state, 'stream-end', 'done')
    expect(state.awaitingInteraction).toBe(true)
    expect(state.isStreamEnded).toBe(true)
    expect(state.runTerminalAck).toBe(true)
    expect(state.isThinking).toBe(false)
    expect(deriveAssistantStreamPhase(state)).toBe('waiting')
  })

  it('appends message.delta to assistant content', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: { text: '雨夜' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: { text: '重逢' },
      }),
    )

    expect(state.messageContent).toBe('雨夜重逢')
  })

  it('strips duplicate choose options from message when tool.completed has choices', () => {
    let state = createInitialAgentStreamUiState()

    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: {
          text: '我注意到您想要继续写作，但没有提供之前的故事情节上下文。\n\n【选项1】悬疑重生：主角意外回到过去。\n\n【选项2】都市成长：职场压力。\n\n【选项3】奇幻冒险：神秘力量。',
        },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-tool',
        payload: {
          name: 'choose',
          choices: [
            { id: 'opt-1', title: '悬疑重生：主角意外回到过去。', description: '' },
            { id: 'opt-2', title: '都市成长：职场压力。', description: '' },
          ],
        },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: {
          text: '\n\n**选项1** - **悬疑重生**：追踪。\n\n**选项2** - **都市成长**：道路。\n\n请告诉我您选择哪个方向。',
        },
      }),
    )

    const content = finalizeAgentMessageContent(state)
    expect(content).toContain('我注意到您想要继续写作')
    expect(content).not.toMatch(/【选项\s*\d+】/)
    expect(content).not.toMatch(/\*\*选项\s*\d+\*\*/)
    expect(content).not.toContain('请告诉我您选择哪个方向')
  })

  it('accepts Chinese think.delta while output tool is running', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: 'step-output',
        payload: { name: 'output' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'think.delta',
        payload: { text: '正在构思续写情节与人物衔接' },
      }),
    )
    const thinkBlock = state.timeline.find((b) => b.kind === 'think')
    expect(thinkBlock?.kind === 'think' && thinkBlock.text).toContain('构思续写')
    expect(state.thinkText).toBe('')
  })

  it('rejects English-heavy think.delta during output', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: 'step-output',
        payload: { name: 'output' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'think.delta',
        payload: { text: 'The user wants to continue writing without context' },
      }),
    )
    expect(state.thinkText).toBe('')
  })

  it('ignores English-heavy leaked think.delta', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'think.delta',
        payload: { text: 'The user wants to continue writing without context' },
      }),
    )
    expect(state.thinkText).toBe('')
  })

  it('clears isThinking on run.completed', () => {
    let state = createInitialAgentStreamUiState()
    state = { ...state, isThinking: true, activeToolCount: 1 }
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'run.completed', payload: { status: 'ok' } }),
    )
    expect(state.isThinking).toBe(false)
    expect(state.activeToolCount).toBe(0)
  })

  it('keeps awaitingInteraction on run.completed when ask_user is pending', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-ask',
        payload: {
          name: 'ask_user',
          display_name: '向用户提问',
          interaction: {
            type: 'ask_user',
            prompt: '请回答以下问题',
            questions: [
              {
                id: 'world_type',
                prompt: '世界类型？',
                type: 'single_select',
                options: [
                  { id: 'a', title: '玄幻', description: '' },
                  { id: 'b', title: '都市', description: '' },
                ],
              },
            ],
          },
        },
      }),
    )
    expect(state.awaitingInteraction).toBe(true)
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'run.completed', payload: { status: 'ok' } }),
    )
    expect(state.awaitingInteraction).toBe(true)
    expect(state.isStreamEnded).toBe(false)
    expect(deriveAssistantStreamPhase(state)).toBe('waiting')
  })

  it('marks memory tool failed when payload status is error', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-mem',
        payload: {
          name: 'memory_create',
          display_name: '创建记忆',
          status: 'error',
          output: '记忆更新失败：HTTP 500',
          output_summary: '记忆更新失败：HTTP 500',
        },
      }),
    )
    expect(state.stepStates[0].status).toBe('failed')
    expect(state.stepStates[0].outputSummary).toContain('失败')
  })

  it('parses AskUser CC interaction (kind choose + options)', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-ask',
        payload: {
          name: 'AskUser',
          display_name: '询问',
          interaction: {
            kind: 'choose',
            options: [
              { id: 'a', title: '科幻', description: '未来世界' },
              { id: 'b', title: '悬疑', description: '推理解谜' },
            ],
          },
        },
      }),
    )
    const step = state.stepStates[0]
    expect(step.toolName).toBe('AskUser')
    expect(step.choices).toHaveLength(2)
    expect(step.choices?.[0].title).toBe('科幻')
    expect(step.interaction?.type).toBe('single_select')
  })

  it('parses ask_user question options from nested interaction payload', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-ask',
        payload: {
          name: 'ask_user',
          interaction: {
            type: 'ask_user',
            questions: [
              {
                id: 'q1',
                prompt: '主角身份？',
                type: 'single_select',
                interaction: {
                  type: 'single_select',
                  options: [
                    { id: 'x', title: '穿越者', description: '' },
                    { id: 'y', title: '重生者', description: '' },
                  ],
                },
              },
            ],
          },
        },
      }),
    )
    const step = state.stepStates[0]
    expect(step.interaction?.questions?.[0].options).toHaveLength(2)
    expect(step.interaction?.questions?.[0].options?.[0].title).toBe('穿越者')
  })

  it('downgrades ask_user question to user_input when select options are empty', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-ask',
        payload: {
          name: 'ask_user',
          interaction: {
            type: 'ask_user',
            questions: [
              {
                id: 'q1',
                prompt: '第一章开篇用什么叙事顺序？',
                type: 'single_select',
                options: [],
              },
            ],
          },
        },
      }),
    )
    expect(state.stepStates[0].interaction?.questions?.[0].type).toBe('user_input')
  })

  it('does not append think.delta while choose tool is running', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: 'step-choose',
        payload: { name: 'choose' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'think.delta',
        payload: { text: '3. 冒险/奇幻方向 - 史诗旅程' },
      }),
    )
    expect(state.thinkText).toBe('')
  })

  it('does not replace streamed message body when output tool completes', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: { text: '第一句。第二句。' },
      }),
    )
    const full = '第一段第一句。\n\n第二段第一句。'
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-output',
        payload: { name: 'output', output: full },
      }),
    )
    expect(state.messageContent).toBe('第一句。第二句。')
  })

  it('fills message body from output when stream had no text', () => {
    let state = createInitialAgentStreamUiState()
    const full = '第一段第一句。\n\n第二段第一句。'
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-output',
        payload: { name: 'output', output: full },
      }),
    )
    expect(state.messageContent).toBe(full)
  })

  it('does not duplicate output tool body when messageContent already streamed text', () => {
    let state = createInitialAgentStreamUiState()
    const report = '📊 测试执行报告\n\n✅ 执行情况总览\n全部完成'
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'message.delta',
        payload: { text: report },
      }),
    )
    expect(state.timeline.filter((b) => b.kind === 'text')).toHaveLength(0)
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-output',
        payload: { name: 'output', output: report },
      }),
    )
    expect(state.timeline.filter((b) => b.kind === 'text')).toHaveLength(0)
    expect(finalizeAgentMessageContent(state)).toBe(report)
  })

  it('uses wire result_labels for memory_read without full output', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.completed',
        step_id: 'step-mem',
        payload: {
          name: 'memory_read',
          display_name: '读取角色库',
          status: 'ok',
          result_labels: ['张三', '李四'],
          output_summary: '角色库共 2 人：张三, 李四',
        },
      }),
    )
    expect(state.stepStates[0].resultLabels).toEqual(['张三', '李四'])
    expect(state.stepStates[0].outputSummary).toBe('角色库共 2 人：张三, 李四')
  })

  it('marks stream ended on planning.failed when not awaiting interaction', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({ type: 'planning.failed', payload: { error: '规划 JSON 无效' } }),
    )
    expect(state.isStreamEnded).toBe(true)
    expect(state.runTerminalAck).toBe(true)
    expect(state.streamError).toBe('规划 JSON 无效')
    expect(deriveAssistantStreamPhase(state)).toBe('error')
  })

  it('marks stream ended on stream-end event', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(state, 'stream-end', 'done')
    expect(state.isStreamEnded).toBe(true)
    expect(state.activeToolCount).toBe(0)
  })

  it('accumulates chapter.stream.delta into tool step displayExcerpt', () => {
    let state = createInitialAgentStreamUiState()
    const sid = 'step_chapter_write'
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'chapter.stream.started',
        step_id: sid,
        payload: { tool: 'Write', title: '第三章' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'chapter.stream.delta',
        step_id: sid,
        payload: { text: '江湖夜雨' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'chapter.stream.delta',
        step_id: sid,
        payload: { text: '十年灯' },
      }),
    )
    expect(state.stepStates).toHaveLength(1)
    expect(state.stepStates[0].displayExcerpt).toBe('江湖夜雨十年灯')
    expect(state.stepStates[0].detail).toContain('7 字')
  })

  it('ignores duplicate events with the same sequence', () => {
    let state = createInitialAgentStreamUiState()
    const payload = JSON.stringify({
      type: 'tool.started',
      sequence: 7,
      step_id: 'step-write',
      payload: { name: 'choose' },
    })
    state = applyAgentEvent(state, 'agent-event', payload)
    const afterDup = applyAgentEvent(state, 'agent-event', payload)
    expect(afterDup.stepStates).toHaveLength(1)
    expect(afterDup.timeline.filter((b) => b.kind === 'tool')).toHaveLength(1)
  })

  it('ignores duplicate events with the same event_id', () => {
    let state = createInitialAgentStreamUiState()
    const payload = JSON.stringify({
      event_id: 'evt_msg_1',
      type: 'message.delta',
      sequence: 99,
      payload: { text: '交付' },
    })
    state = applyAgentEvent(state, 'agent-event', payload)
    const afterDup = applyAgentEvent(state, 'agent-event', payload)
    expect(finalizeAgentMessageContent(afterDup)).toBe('交付')
  })
})
