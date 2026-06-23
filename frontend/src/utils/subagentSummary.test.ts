import { describe, expect, it } from 'vitest'
import {
  extractSubagentTrailingDelivery,
  stripSubagentSummaryDuplicate,
} from './subagentSummary'

describe('stripSubagentSummaryDuplicate', () => {
  it('removes duplicate completion heading', () => {
    const raw = `## 子任务完成：优化第6章字数到3000字以内

**状态**：已完成（子 Agent run）

### 摘要
正文内容`
    expect(stripSubagentSummaryDuplicate(raw, '优化第6章字数到3000字以内')).toBe(
      '### 摘要\n正文内容',
    )
  })
})

describe('extractSubagentTrailingDelivery', () => {
  it('strips orchestration prose prefix duplicated in summary', () => {
    const orch = '先分析记忆树结构。'
    const summary = '先分析记忆树结构。\n\n## 完整摘要\n正文'
    expect(extractSubagentTrailingDelivery(summary, orch)).toBe('## 完整摘要\n正文')
  })

  it('returns empty when summary equals orchestration prose', () => {
    expect(extractSubagentTrailingDelivery('仅思考', '仅思考')).toBe('')
  })
})
