import { describe, expect, it } from 'vitest'
import { GLYPHS_5X7, getGlyph5x7, scaleUp5x7, type Glyph5x7 } from './glyphs5x7'

const EXPECTED_CHARS = [
  // 大写
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  // 小写
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  // 数字
  ...'0123456789'.split(''),
  // 标点（手列每个 key）
  '.', ',', '!', '?', "'", '"', '-', '+', '/', ':', ';', '(', ')', '[', ']',
]

// 用于去重断言（避免双字符键如 '"' 重复计入）
const EXPECTED_UNIQUE = Array.from(new Set(EXPECTED_CHARS))

describe('glyphs5x7 字模表', () => {
  it('包含所有预期字符', () => {
    expect(EXPECTED_CHARS.length).toBe(77) // 26 + 26 + 10 + 15
    for (const ch of EXPECTED_CHARS) {
      expect(getGlyph5x7(ch), `字符 ${JSON.stringify(ch)} 应命中`).not.toBeNull()
    }
  })

  it('每个字模恰好 7 个 uint8', () => {
    for (const [ch, g] of Object.entries(GLYPHS_5X7)) {
      expect(g.length, `${ch} 字模长度`).toBe(7)
    }
  })

  it('每个 uint8 的有效位 ≤ 5（不能溢出 5 列笔画）', () => {
    for (const [ch, g] of Object.entries(GLYPHS_5X7)) {
      for (let i = 0; i < 7; i++) {
        const row = g[i]
        // 高 3 位必须为 0
        expect((row >> 5) & 0b111, `${ch} 第 ${i} 行溢出`).toBe(0)
      }
    }
  })

  it('未收录字符返回 null（走回退）', () => {
    expect(getGlyph5x7('你')).toBeNull()
    expect(getGlyph5x7('中')).toBeNull()
    expect(getGlyph5x7('🚀')).toBeNull()
    expect(getGlyph5x7('é')).toBeNull()
    expect(getGlyph5x7('@')).toBeNull()
    expect(getGlyph5x7('#')).toBeNull()
  })

  it('descender 字符（g/j/p/q/y）已截断为 7 行', () => {
    // 8-bit 终端风格：丢掉下伸以保持统一 7 行高度
    for (const ch of ['g', 'j', 'p', 'q', 'y']) {
      const g = getGlyph5x7(ch)
      expect(g, `${ch} 应存在`).not.toBeNull()
      expect(g!.length).toBe(7)
    }
  })
})

describe('scaleUp5x7 缩放', () => {
  // A 的位图：每行用 .# 注释对照
  //  .###.   -> 0b01110
  //  #...#   -> 0b10001
  //  #...#   -> 0b10001
  //  #####   -> 0b11111
  //  #...#   -> 0b10001
  //  #...#   -> 0b10001
  //  #...#   -> 0b10001
  const A: Glyph5x7 = [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]

  it('cell=7 输出 7×7 网格（1:1 缩放）', () => {
    const grid = scaleUp5x7(A, 7)
    expect(grid.length).toBe(49)
    // 顶行 (y=0) 应只亮 x=1,2,3
    expect(grid[0 * 7 + 0]).toBe(0)
    expect(grid[0 * 7 + 1]).toBe(1)
    expect(grid[0 * 7 + 2]).toBe(1)
    expect(grid[0 * 7 + 3]).toBe(1)
    expect(grid[0 * 7 + 4]).toBe(0)
    // 中心行 (y=3) 应全亮 0..4
    for (let x = 0; x < 5; x++) {
      expect(grid[3 * 7 + x], `(3,${x})`).toBe(1)
    }
    // x=5,6 是字外（不被 5×7 笔画覆盖），应保持 0
    for (let x = 5; x < 7; x++) {
      expect(grid[3 * 7 + x], `(3,${x}) 字外应空`).toBe(0)
    }
  })

  it('cell=14 输出 14×14 网格（每个原像素 = 2×2 块）', () => {
    const grid = scaleUp5x7(A, 14)
    expect(grid.length).toBe(196)
    // 顶行 (y=0,1) 应只亮 x=2..7（A 顶行 .###. 占 x=1,2,3 → 放大后 x=2,3,4,5,6,7）
    expect(grid[0 * 14 + 0]).toBe(0)
    expect(grid[0 * 14 + 1]).toBe(0)
    expect(grid[0 * 14 + 2]).toBe(1)
    expect(grid[0 * 14 + 3]).toBe(1)
    expect(grid[0 * 14 + 4]).toBe(1)
    expect(grid[0 * 14 + 5]).toBe(1)
    expect(grid[0 * 14 + 6]).toBe(1)
    expect(grid[0 * 14 + 7]).toBe(1)
    expect(grid[0 * 14 + 8]).toBe(0)
  })

  it('cell=21 输出 21×21 网格（每个原像素 = 3×3 块）', () => {
    // '.' 字符：仅最后一行（y=6）x=2 亮（0b00100）
    const dot: Glyph5x7 = [0, 0, 0, 0, 0, 0, 0b00100]
    const grid = scaleUp5x7(dot, 21)
    expect(grid.length).toBe(441)
    // 前 6 行（y=0..17）应全空
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 21; x++) {
        expect(grid[y * 21 + x], `(${x},${y})`).toBe(0)
      }
    }
    // 最后 3 行 (y=18,19,20) 对应原图 y=6，x=2 映射到屏 6..8
    for (let y = 18; y < 21; y++) {
      for (let x = 0; x < 6; x++) {
        expect(grid[y * 21 + x], `(${x},${y}) 左`).toBe(0)
      }
      for (let x = 6; x < 9; x++) {
        expect(grid[y * 21 + x], `(${x},${y}) 中`).toBe(1)
      }
      for (let x = 9; x < 21; x++) {
        expect(grid[y * 21 + x], `(${x},${y}) 右`).toBe(0)
      }
    }
  })

  it('cell 非 7 倍数抛错', () => {
    expect(() => scaleUp5x7(A, 12)).toThrow(/multiple of 7/)
    expect(() => scaleUp5x7(A, 16)).toThrow(/multiple of 7/)
    expect(() => scaleUp5x7(A, 24)).toThrow(/multiple of 7/)
  })
})
