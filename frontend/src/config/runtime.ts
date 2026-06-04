/**
 * VITE_DIRECT_PYTHON=true：全部 /api 代理到 Python :8000（仅纯 Python 联调）。
 * false：/api/auth → 远程网关，/api/agent → 本机 PyAI :8082（见 vite.config.ts）。
 */
export const DIRECT_PYTHON =
  import.meta.env.VITE_DIRECT_PYTHON === 'true' ||
  import.meta.env.VITE_DIRECT_PYTHON === '1'

export const PYTHON_API_BASE = '/api'
