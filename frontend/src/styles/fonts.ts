/** 字体栈 — 独立模块，避免 theme ↔ typography 循环依赖 */
export const font = {
  body: "'Inter', 'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
  display: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace",
  monoAlt: "'Courier New', monospace",
} as const
