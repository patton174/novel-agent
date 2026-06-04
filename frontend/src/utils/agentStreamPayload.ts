import type { AgentStreamRequestBody } from '../types/agent'
import { DIRECT_PYTHON } from '../config/runtime'
import { getOrCreateAgentSessionId } from './agentSession'
import { randomUUID } from './randomUUID'

/** 网关接受的请求体（扁平字段） */
export function toGatewayStreamBody(body: AgentStreamRequestBody): AgentStreamRequestBody {
  return body
}

/** @deprecated 直连 Python legacy 路径已移除 */
export function toPythonStreamBody(body: AgentStreamRequestBody): Record<string, unknown> {
  const sessionId = body.session_id?.trim() || getOrCreateAgentSessionId()
  const history = (body.history ?? []).filter(
    (t) => t.content.trim() && (t.role === 'user' || t.role === 'assistant'),
  )
  return {
    run_id: `run_${randomUUID()}`,
    session_id: sessionId,
    message_id: `message_${randomUUID()}`,
    user: { id: 0, roles: ['writer'] },
    input: { message: body.message, mode: 'auto' },
    context: {
      host_mode: Boolean(body.host_mode),
      ...(body.context_text?.trim() ? { text: body.context_text.trim() } : {}),
      ...(history.length > 0 ? { history } : {}),
      preferences: {
        mode: 'auto',
        host_mode: Boolean(body.host_mode),
      },
    },
    trace: {
      emit_think: true,
      emit_tool: true,
      emit_skill: false,
      emit_mcp: false,
    },
  }
}

export function toStreamRequestBody(
  body: AgentStreamRequestBody,
): AgentStreamRequestBody | Record<string, unknown> {
  return DIRECT_PYTHON ? toPythonStreamBody(body) : toGatewayStreamBody(body)
}
