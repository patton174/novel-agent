/** 字体栈 — 系统字体优先，不依赖 Google Fonts CDN */
export const font = {
  // 基础字体统一使用 Geist (与 globals.css 的 --font-sans 对齐)
  body: "'Geist Variable', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', system-ui, sans-serif",
  // display 字体保留宋体/Serif，为营销页提供文学感 (intentional)
  display: "'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif",
  mono: "ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace",
  monoAlt: "'Courier New', monospace",
} as const
