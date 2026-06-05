import { DIRECT_PYTHON } from '../config/runtime'
import { getAuthHeaders } from '../utils/auth'
import { secureFetch } from './secureFetch'

export interface WsTicketResult {
  ticket: string
  expiresIn: number
}

export async function fetchWsTicket(params: {
  purpose: 'run' | 'status'
  runId?: string
  sessionId?: string
}): Promise<WsTicketResult | null> {
  if (DIRECT_PYTHON) {
    return null
  }
  const response = await secureFetch('/api/auth/ws-ticket', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      purpose: params.purpose,
      runId: params.runId,
      sessionId: params.sessionId,
    }),
  })
  if (!response.ok) {
    return null
  }
  return (await response.json()) as WsTicketResult
}
