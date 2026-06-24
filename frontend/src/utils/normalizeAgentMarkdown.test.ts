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

  it('restores inline fenced code blocks flattened onto one line', () => {
    const flat =
      '### 💕 网恋伏笔设计 ``` 关键问题：她是怎么找到林逸的？ ✅ 合理化解释： 1. 留学时在游戏里认识 2. 女主当时段位更高 ``` ---'
    const normalized = normalizeAgentMarkdown(flat)
    expect(normalized).toMatch(/```[\s\S]*?关键问题：她是怎么找到林逸的？[\s\S]*?```/)
    expect(normalized).toContain('✅ 合理化解释：')
    expect(normalized).toMatch(/1\.\s*留学时/)
  })

  it('does not rewrite list markers inside fenced blocks', () => {
    const input = '前言\n\n```\n- 保留\n1. 编号\n```\n\n后缀'
    expect(normalizeAgentMarkdown(input)).toBe('前言\n\n```text\n- 保留\n1. 编号\n```\n\n后缀')
  })

  it('restores line breaks inside well-formed but flattened fenced bodies', () => {
    const input =
      '```\n关键问题：她是怎么找到林逸的？ ✅ 合理化解释： 1. 留学时 2. 女主更高 ```'
    const normalized = normalizeAgentMarkdown(input)
    expect(normalized).toContain('✅ 合理化解释：')
    expect(normalized).toMatch(/1\.\s*留学时\n2\./)
  })

  it('restores narrative line breaks for flat prose without fences', () => {
    const flat = '关键问题：她是怎么找到林逸的？ ✅ 合理化解释： 1. 留学时 2. 女主更高'
    const normalized = normalizeAgentMarkdown(flat)
    expect(normalized).toMatch(/？\n\n✅/)
    expect(normalized).toMatch(/1\.\s*留学时\n2\./)
  })

  it('moves emoji or CJK out of fence language slot into code body', () => {
    const input = '```✅ 合理化解释：\n1. 留学时\n```'
    const normalized = normalizeAgentMarkdown(input)
    expect(normalized).toBe('```text\n✅ 合理化解释：\n1. 留学时\n```')
  })

  it('preserves checklist headings inside fenced bodies', () => {
    const input = `关键问题：她是怎么找到林逸的？

\`\`\`
✅ 合理化解释：
1. 留学时在游戏里认识
2. 女主当时段位更高
\`\`\``
    const normalized = normalizeAgentMarkdown(input)
    expect(normalized).toContain('✅ 合理化解释：')
    expect(normalized).toContain('1. 留学时在游戏里认识')
  })
})
