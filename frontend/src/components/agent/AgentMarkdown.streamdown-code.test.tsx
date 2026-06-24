import { cleanup, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AgentMarkdown } from './AgentMarkdown'
import { prepareAgentMarkdown } from './markdown/prepareAgentMarkdown'

const SAMPLE = `关键问题：她是怎么找到林逸的？

\`\`\`
✅ 合理化解释：
1. 留学时在游戏里认识
2. 女主当时段位更高
\`\`\``

afterEach(() => cleanup())

describe('AgentMarkdown streamdown code plugin', () => {
  it('prepares markdown without swallowing checklist headings', () => {
    expect(prepareAgentMarkdown(SAMPLE)).toContain('✅ 合理化解释：')
  })

  it('renders fenced blocks via Streamdown code plugin with preserved lines', () => {
    const { container } = render(<AgentMarkdown text={SAMPLE} variant="memory" />)
    const root = container.querySelector('[data-variant="memory"]')!
    expect(within(root).getByText(/关键问题：她是怎么找到林逸的？/i)).toBeInTheDocument()
    const body = root.querySelector('[data-streamdown="code-block-body"]')
    expect(body).toBeTruthy()
    expect(body!.textContent).toContain('合理化解释')
    expect(body!.textContent).toContain('1. 留学时在游戏里认识')
    expect(body!.textContent).toContain('2. 女主当时段位更高')
  })
})
