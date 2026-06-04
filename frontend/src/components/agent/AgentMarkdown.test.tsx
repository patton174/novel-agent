import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AgentMarkdown } from './AgentMarkdown'

const WORLD_SAMPLE = `##《无限掉宝的世界》

###一、创世法则

世界诞生于一件名为「全知宝匣」的混沌器物。

-白色·凡品（60%）
-绿色·良品（25%）

1. 击杀者权重：玩家击杀比原住民击杀掉率更低。
2. 装备加成：特定装备可提升掉宝概率。

---

备注：世界观将随剧情推进逐步揭示。`

afterEach(() => {
  cleanup()
})

describe('AgentMarkdown', () => {
  it('renders headings and bold', () => {
    render(<AgentMarkdown text={'## 标题\n\n**加粗** 文本'} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('标题')
    expect(screen.getByText('加粗')).toBeInTheDocument()
  })

  it('renders list items', () => {
    render(
      <AgentMarkdown
        text={`- 第一项
- 第二项`}
      />,
    )
    expect(screen.getByText('第一项')).toBeInTheDocument()
    expect(screen.getByText('第二项')).toBeInTheDocument()
  })

  it('renders Chinese headings without space after hash', () => {
    const { container } = render(
      <AgentMarkdown
        text={`##《测试标题》

###小节`}
      />,
    )
    const root = container.querySelector('[data-variant="chat"]')!
    expect(within(root).getByRole('heading', { level: 2 })).toHaveTextContent('《测试标题》')
    expect(within(root).getByRole('heading', { level: 3 })).toHaveTextContent('小节')
  })

  it('renders GFM tables with header and cells', () => {
    const { container } = render(
      <AgentMarkdown
        text={`说明文字
| 列1 | 列2 |
| --- | --- |
| A | B |`}
      />,
    )
    const root = container.querySelector('[data-variant="chat"]')!
    expect(within(root).getByRole('table')).toBeInTheDocument()
    expect(within(root).getByText('列1')).toBeInTheDocument()
    expect(within(root).getByText('A')).toBeInTheDocument()
  })

  it('renders ordered lists, hr and world sample structure', () => {
    const { container } = render(<AgentMarkdown text={WORLD_SAMPLE} />)
    const root = container.querySelector('[data-variant="chat"]')!
    expect(within(root).getByRole('heading', { level: 2 })).toHaveTextContent('《无限掉宝的世界》')
    expect(within(root).getByRole('heading', { level: 3 })).toHaveTextContent('一、创世法则')
    expect(within(root).getByText(/击杀者权重/)).toBeInTheDocument()
    expect(within(root).getByText(/备注：世界观/)).toBeInTheDocument()
  })
})
