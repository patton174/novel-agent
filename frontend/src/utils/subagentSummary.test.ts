import { describe, expect, it } from 'vitest'
import { stripSubagentSummaryDuplicate } from './subagentSummary'

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
