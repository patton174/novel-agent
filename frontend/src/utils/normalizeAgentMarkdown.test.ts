import { describe, expect, it } from 'vitest'
import { normalizeAgentMarkdown, repairFlattenedMarkdown } from './normalizeAgentMarkdown'

describe('normalizeAgentMarkdown', () => {
  it('inserts space after heading markers when missing', () => {
    const input = '##《无限掉宝的世界》\n###一、创世法则'
    expect(normalizeAgentMarkdown(input)).toBe(
      '## 《无限掉宝的世界》\n### 一、创世法则',
    )
  })

  it('inserts space after list markers when missing', () => {
    expect(normalizeAgentMarkdown('-白色·凡品（60%）')).toBe('- 白色·凡品（60%）')
    expect(normalizeAgentMarkdown('1.击杀者权重')).toBe('1. 击杀者权重')
  })

  it('inserts blank line before GFM table rows', () => {
    const input = '说明\n| A | B |\n| --- | --- |'
    expect(normalizeAgentMarkdown(input)).toBe('说明\n\n| A | B |\n| --- | --- |')
  })

  it('repairs single-line markdown tables for history replay', () => {
    const flat =
      '## 本次交付总结 | 列表位 | 标题 | 字数 | | --- | --- | --- | | 第 6 章 | 深入 | 6272 |'
    const repaired = repairFlattenedMarkdown(flat)
    expect(repaired).toMatch(/^## 本次交付/)
    expect(repaired).toContain('\n| 列表位')
    expect(repaired).toContain('\n| --- |')
  })
})
