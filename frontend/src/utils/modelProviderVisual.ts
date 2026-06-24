/** 提供商视觉标识（参考 cc-switch ProviderIcon 配色思路） */

const PROVIDER_COLORS: Record<string, string> = {
  // 官方 / 国际
  anthropic: '#d97757',
  claude: '#D4915D',
  openai: '#10a37f',
  google: '#4285f4',
  gemini: '#4285F4',
  azure: '#0078d4',
  openrouter: '#6566F1',
  // 国内官方 / 云
  deepseek: '#1E88E5',
  zhipu: '#0F62FE',
  baidu: '#2932E1',
  bailian: '#624AFF',
  kimi: '#6366F1',
  moonshot: '#6366F1',
  stepfun: '#16D6D2',
  modelscope: '#624AFF',
  longcat: '#29E154',
  minimax: '#FF6B6B',
  huoshan: '#3370FF',
  byteplus: '#3370FF',
  doubao: '#3370FF',
  qwen: '#7c3aed',
  // 聚合 / 第三方
  siliconflow: '#6E29F6',
  aihubmix: '#006FFB',
  aigocode: '#5B7FFF',
  rc: '#E96B2C',
  shengsuanyun: '#5B7FFF',
  pateway: '#E96B2C',
  // 其他
  agnes: '#8b5cf6',
  groq: '#f97316',
  ollama: '#1f2937',
  custom: '#64748b',
}

export function providerColor(provider?: string | null): string {
  if (!provider) return PROVIDER_COLORS.custom
  const key = provider.trim().toLowerCase()
  return PROVIDER_COLORS[key] ?? hashColor(key)
}

export function providerInitial(provider?: string | null, label?: string | null): string {
  const src = (provider || label || '?').trim()
  if (!src) return '?'
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return src.slice(0, 2).toUpperCase()
}

function hashColor(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 55% 45%)`
}
