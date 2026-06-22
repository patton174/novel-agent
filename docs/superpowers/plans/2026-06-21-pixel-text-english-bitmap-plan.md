# 像素字英文 5×7 手画点阵化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `PixelText` / `PixelField` 渲染的英文从"Geist 字体微缩光栅化"换成手画 5×7 点阵字模，零外部依赖，全站 16 个调用方零 API 改动。

**Architecture:** 新增 `glyphs5x7.ts` 字模表（约 78 字符：26 大写 + 26 小写 + 10 数字 + 16 标点）。`sampleGlyph` 加查表分支：命中且 `cell` 是 7 倍数 → 用查表位图；未命中或 `cell` 非 7 倍数 → 走现有 canvas 采样回退（保持中文/emoji 支持）。`SIZE_PRESET` 改为 7 倍数；`PixelField.cellRange` 改为 `[14, 77]` 并强制对齐。

**Tech Stack:** TypeScript, React 18, Canvas 2D (采样回退), Vitest (单元测试)

---

## File Structure

| 文件 | 状态 | 职责 |
|------|------|------|
| `frontend/src/components/marketing/pixel/glyphs5x7.ts` | **新建** | 5×7 字模表 + `getGlyph5x7` + `scaleUp5x7` |
| `frontend/src/components/marketing/pixel/glyphs5x7.test.ts` | **新建** | 单元测试：所有 78 字符命中、5×7 缩放正确 |
| `frontend/src/components/marketing/pixel/PixelText.tsx` | **改** | `sampleGlyph` 加查表分支；`SIZE_PRESET` 改 7 倍数 |
| `frontend/src/components/marketing/pixel/PixelField.tsx` | **改** | `cellRange=[14,77]`；`compute()` 强制 7 倍数 |
| 16 个调用方（MarketingNav 等） | **不改** | API 兼容 |

---

## Task 1: 新增 5×7 字模表 + 查表接口

**Files:**
- Create: `frontend/src/components/marketing/pixel/glyphs5x7.ts`

- [ ] **Step 1.1: 创建字模表文件**

```ts
// frontend/src/components/marketing/pixel/glyphs5x7.ts

/**
 * 5×7 手画英文点阵字模（仿 8-bit 终端字体，80 年代 CRT 风格）。
 *
 * 字符集：26 大写 + 26 小写 + 10 数字 + 16 常用标点 = 78 字符。
 * 命中：返回位图；未命中：调用方走 canvas 采样回退（中文/emoji/特殊字符）。
 *
 * 数据格式：每字符 7 个 uint8（每行 1 个），bit 0..4 代表该列是否点亮（1=亮，0=暗）。
 * 注释行用 ASCII 字符（# / .）复刻位图，方便人工审查与改稿。
 *
 * 字符总尺寸：5 列笔画 + 7 行高度 = 5×7 像素；
 * 字间空白由调用方通过 glyphGap 单独控制（不计入字模本身）。
 */
export type Glyph5x7 = readonly [number, number, number, number, number, number, number]

/** 字模表。key 为单字符。 */
export const GLYPHS_5X7: Readonly<Record<string, Glyph5x7>> = {
  // ── 大写字母 A-Z ──
  A: [
    //  .###.
    //  #...#
    //  #...#
    //  #####
    //  #...#
    //  #...#
    //  #...#
    0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001,
  ],
  B: [
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110,
  ],
  C: [
    //  .####
    //  #....
    //  #....
    //  #....
    //  #....
    //  #....
    //  .####
    0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111,
  ],
  D: [
    //  ####.
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  ####.
    0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110,
  ],
  E: [
    //  #####
    //  #....
    //  #....
    //  ####.
    //  #....
    //  #....
    //  #####
    0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111,
  ],
  F: [
    //  #####
    //  #....
    //  #....
    //  ####.
    //  #....
    //  #....
    //  #....
    0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000,
  ],
  G: [
    //  .####
    //  #....
    //  #....
    //  #..##
    //  #...#
    //  #...#
    //  .####
    0b01111, 0b10000, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111,
  ],
  H: [
    //  #...#
    //  #...#
    //  #...#
    //  #####
    //  #...#
    //  #...#
    //  #...#
    0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001,
  ],
  I: [
    //  ###
    //  .#.
    //  .#.
    //  .#.
    //  .#.
    //  .#.
    //  ###
    0b00111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00111,
  ],
  J: [
    //  ..###
    //  ...#.
    //  ...#.
    //  ...#.
    //  ...#.
    //  #..#.
    //  .##..
    0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100,
  ],
  K: [
    //  #...#
    //  #..#.
    //  #.#..
    //  ##...
    //  #.#..
    //  #..#.
    //  #...#
    0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001,
  ],
  L: [
    //  #....
    //  #....
    //  #....
    //  #....
    //  #....
    //  #....
    //  #####
    0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111,
  ],
  M: [
    //  #...#
    //  ##.##
    //  #.#.#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001,
  ],
  N: [
    //  #...#
    //  ##..#
    //  #.#.#
    //  #.#.#
    //  #.#.#
    //  #..##
    //  #...#
    0b10001, 0b11001, 0b10101, 0b10101, 0b10101, 0b10011, 0b10001,
  ],
  O: [
    //  .###.
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  .###.
    0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110,
  ],
  P: [
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    //  #....
    //  #....
    //  #....
    0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000,
  ],
  Q: [
    //  .###.
    //  #...#
    //  #...#
    //  #...#
    //  #.#.#
    //  #..#.
    //  .##.#
    0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101,
  ],
  R: [
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    //  #.#..
    //  #..#.
    //  #...#
    0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001,
  ],
  S: [
    //  .####
    //  #....
    //  #....
    //  .###.
    //  ....#
    //  ....#
    //  ####.
    0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110,
  ],
  T: [
    //  #####
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100,
  ],
  U: [
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  .###.
    0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110,
  ],
  V: [
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  .#.#.
    //  ..#..
    0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100,
  ],
  W: [
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  #.#.#
    //  ##.##
    //  #...#
    0b10001, 0b10001, 0b10001, 0b10001, 0b10101, 0b11011, 0b10001,
  ],
  X: [
    //  #...#
    //  #...#
    //  .#.#.
    //  ..#..
    //  .#.#.
    //  #...#
    //  #...#
    0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001,
  ],
  Y: [
    //  #...#
    //  #...#
    //  .#.#.
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100,
  ],
  Z: [
    //  #####
    //  ....#
    //  ...#.
    //  ..#..
    //  .#...
    //  #....
    //  #####
    0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111,
  ],

  // ── 小写字母 a-z（与对应大写形态区分：x-height 5 行，ascender/descender 上下各 1 行）──
  a: [
    //  .....
    //  .....
    //  .###.
    //  ....#
    //  .####
    //  #...#
    //  .####
    0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111,
  ],
  b: [
    //  #....
    //  #....
    //  ####.
    //  #...#
    //  #...#
    //  #...#
    //  ####.
    0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110,
  ],
  c: [
    //  .....
    //  .....
    //  .####
    //  #....
    //  #....
    //  #....
    //  .####
    0b00000, 0b00000, 0b01111, 0b10000, 0b10000, 0b10000, 0b01111,
  ],
  d: [
    //  ....#
    //  ....#
    //  .####
    //  #...#
    //  #...#
    //  #...#
    //  .####
    0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111,
  ],
  e: [
    //  .....
    //  .....
    //  .###.
    //  #...#
    //  ######
    //  #....
    //  .####
    0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01111,
  ],
  f: [
    //  ..##.
    //  .#...
    //  .###.
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    0b00110, 0b01000, 0b01110, 0b01000, 0b01000, 0b01000, 0b01000,
  ],
  g: [
    //  .....
    //  .....
    //  .####
    //  #...#
    //  #...#
    //  .####
    //  ....#
    //  .###.
    0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110,
  ] as unknown as Glyph5x7, // 注：g 是 descender 字符，需要特殊处理（见 Task 4）
  h: [
    //  #....
    //  #....
    //  ####.
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001,
  ],
  i: [
    //  .#...
    //  .....
    //  ##...
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    0b01000, 0b00000, 0b11000, 0b01000, 0b01000, 0b01000, 0b01000,
  ],
  j: [
    //  ...#.
    //  .....
    //  ..##.
    //  ...#.
    //  ...#.
    //  ...#.
    //  #..#.
    //  .##..
    0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100,
  ] as unknown as Glyph5x7,
  k: [
    //  #....
    //  #....
    //  #..#.
    //  #.#..
    //  ##...
    //  #.#..
    //  #..#.
    0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010,
  ],
  l: [
    //  ##...
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    //  .###.
    0b11000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110,
  ],
  m: [
    //  .....
    //  .....
    //  #.#.#
    //  ##.##
    //  #.#.#
    //  #...#
    //  #...#
    0b00000, 0b00000, 0b10101, 0b11011, 0b10101, 0b10001, 0b10001,
  ],
  n: [
    //  .....
    //  .....
    //  ####.
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001,
  ],
  o: [
    //  .....
    //  .....
    //  .###.
    //  #...#
    //  #...#
    //  #...#
    //  .###.
    0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110,
  ],
  p: [
    //  .....
    //  .....
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    //  #....
    //  #....
    0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000,
  ] as unknown as Glyph5x7,
  q: [
    //  .....
    //  .....
    //  .####
    //  #...#
    //  #...#
    //  .####
    //  ....#
    //  ....#
    0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001,
  ] as unknown as Glyph5x7,
  r: [
    //  .....
    //  .....
    //  ####.
    //  #...#
    //  #....
    //  #....
    //  #....
    0b00000, 0b00000, 0b11110, 0b10001, 0b10000, 0b10000, 0b10000,
  ],
  s: [
    //  .....
    //  .....
    //  .####
    //  #....
    //  .###.
    //  ....#
    //  ####.
    0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110,
  ],
  t: [
    //  .#...
    //  .#...
    //  ####.
    //  .#...
    //  .#...
    //  .#...
    //  ..##.
    0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000, 0b00110,
  ],
  u: [
    //  .....
    //  .....
    //  #...#
    //  #...#
    //  #...#
    //  #...#
    //  .####
    0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10001, 0b01111,
  ],
  v: [
    //  .....
    //  .....
    //  #...#
    //  #...#
    //  #...#
    //  .#.#.
    //  ..#..
    0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100,
  ],
  w: [
    //  .....
    //  .....
    //  #...#
    //  #...#
    //  #.#.#
    //  ##.##
    //  #...#
    0b00000, 0b00000, 0b10001, 0b10001, 0b10101, 0b11011, 0b10001,
  ],
  x: [
    //  .....
    //  .....
    //  #...#
    //  .#.#.
    //  ..#..
    //  .#.#.
    //  #...#
    0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001,
  ],
  y: [
    //  .....
    //  .....
    //  #...#
    //  #...#
    //  #...#
    //  .####
    //  ....#
    //  .###.
    0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110,
  ] as unknown as Glyph5x7,
  z: [
    //  .....
    //  .....
    //  #####
    //  ...#.
    //  ..#..
    //  .#...
    //  #####
    0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111,
  ],

  // ── 数字 0-9 ──
  '0': [
    //  .###.
    //  #...#
    //  #..##
    //  #.#.#
    //  ##..#
    //  #...#
    //  .###.
    0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110,
  ],
  '1': [
    //  ..#..
    //  .##..
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    //  .###.
    0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110,
  ],
  '2': [
    //  .###.
    //  #...#
    //  ....#
    //  ...#.
    //  ..#..
    //  .#...
    //  #####
    0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111,
  ],
  '3': [
    //  .###.
    //  #...#
    //  ....#
    //  ..##.
    //  ....#
    //  #...#
    //  .###.
    0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110,
  ],
  '4': [
    //  ...#.
    //  ..##.
    //  .#.#.
    //  #..#.
    //  #####
    //  ...#.
    //  ...#.
    0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010,
  ],
  '5': [
    //  #####
    //  #....
    //  ####.
    //  ....#
    //  ....#
    //  #...#
    //  .###.
    0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110,
  ],
  '6': [
    //  .###.
    //  #....
    //  #....
    //  ####.
    //  #...#
    //  #...#
    //  .###.
    0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110,
  ],
  '7': [
    //  #####
    //  ....#
    //  ...#.
    //  ..#..
    //  .#...
    //  .#...
    //  .#...
    0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000,
  ],
  '8': [
    //  .###.
    //  #...#
    //  #...#
    //  .###.
    //  #...#
    //  #...#
    //  .###.
    0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110,
  ],
  '9': [
    //  .###.
    //  #...#
    //  #...#
    //  .####
    //  ....#
    //  ....#
    //  .###.
    0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110,
  ],

  // ── 标点 ──
  '.': [
    //  .....
    //  .....
    //  .....
    //  .....
    //  .....
    //  .....
    //  ..#..
    0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100,
  ],
  ',': [
    //  .....
    //  .....
    //  .....
    //  .....
    //  .....
    //  ..#..
    //  .#...
    0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b01000,
  ],
  '!': [
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    //  ..#..
    //  .....
    //  ..#..
    0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100,
  ],
  '?': [
    //  .###.
    //  #...#
    //  ....#
    //  ...#.
    //  ..#..
    //  .....
    //  ..#..
    0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100,
  ],
  "'": [
    //  ..#..
    //  ..#..
    //  ..#..
    //  .....
    //  .....
    //  .....
    //  .....
    0b00100, 0b00100, 0b00100, 0b00000, 0b00000, 0b00000, 0b00000,
  ],
  '"': [
    //  .#.#.
    //  .#.#.
    //  .#.#.
    //  .....
    //  .....
    //  .....
    //  .....
    0b01010, 0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000,
  ],
  '-': [
    //  .....
    //  .....
    //  .....
    //  #####
    //  .....
    //  .....
    //  .....
    0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000,
  ],
  '+': [
    //  .....
    //  ..#..
    //  ..#..
    //  #####
    //  ..#..
    //  ..#..
    //  .....
    0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000,
  ],
  '/': [
    //  ....#
    //  ....#
    //  ...#.
    //  ..#..
    //  .#...
    //  #....
    //  #....
    0b00001, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b10000,
  ],
  ':': [
    //  .....
    //  .....
    //  ..#..
    //  .....
    //  .....
    //  ..#..
    //  .....
    0b00000, 0b00000, 0b00100, 0b00000, 0b00000, 0b00100, 0b00000,
  ],
  ';': [
    //  .....
    //  .....
    //  ..#..
    //  .....
    //  .....
    //  ..#..
    //  .#...
    0b00000, 0b00000, 0b00100, 0b00000, 0b00000, 0b00100, 0b01000,
  ],
  '(': [
    //  ..##.
    //  .#...
    //  #....
    //  #....
    //  #....
    //  .#...
    //  ..##.
    0b00110, 0b01000, 0b10000, 0b10000, 0b10000, 0b01000, 0b00110,
  ],
  ')': [
    //  .##..
    //  ...#.
    //  ....#
    //  ....#
    //  ....#
    //  ...#.
    //  .##..
    0b01100, 0b00010, 0b00001, 0b00001, 0b00001, 0b00010, 0b01100,
  ],
  '[': [
    //  .####
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    //  .#...
    //  .####
    0b01111, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01111,
  ],
  ']': [
    //  ####.
    //  ...#.
    //  ...#.
    //  ...#.
    //  ...#.
    //  ...#.
    //  ####.
    0b11110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b11110,
  ],
}

/** 查询接口：命中返回位图，未命中返回 null（调用方走 canvas 采样回退） */
export function getGlyph5x7(ch: string): Glyph5x7 | null {
  return GLYPHS_5X7[ch] ?? null
}

/**
 * 把 5×7 字模放大到 cell×cell 网格（cell 必须是 7 的倍数）。
 * 每个原图 1 像素 → 输出 (cell/7) × (cell/7) 屏像素块。
 * 已手画的位图不叠加噪点（保持设计完整性）。
 */
export function scaleUp5x7(glyph: Glyph5x7, cell: number): Uint8Array {
  if (cell % 7 !== 0) {
    throw new Error(`scaleUp5x7: cell must be multiple of 7, got ${cell}`)
  }
  const grid = new Uint8Array(cell * cell)
  const block = cell / 7 // 每个原像素在输出中占 block×block 个像素
  for (let y = 0; y < 7; y++) {
    const row = glyph[y]
    for (let x = 0; x < 5; x++) {
      const on = (row >> (4 - x)) & 1 // 高位在左
      if (!on) continue
      // 填满 (x*block, y*block) 起的 block×block 块
      for (let dy = 0; dy < block; dy++) {
        for (let dx = 0; dx < block; dx++) {
          const ox = x * block + dx
          const oy = y * block + dy
          grid[oy * cell + ox] = 1
        }
      }
    }
  }
  return grid
}
```

- [ ] **Step 1.2: 校验文件 TypeScript**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm exec tsc --noEmit 2>&1 | grep "glyphs5x7" | head -20
```

预期：无输出（该文件单独存在无错；调用方未接入所以有未使用警告也 OK）。

---

## Task 2: 写 5×7 字模单元测试

**Files:**
- Create: `frontend/src/components/marketing/pixel/glyphs5x7.test.ts`

- [ ] **Step 2.1: 创建测试文件**

```ts
// frontend/src/components/marketing/pixel/glyphs5x7.test.ts
import { describe, expect, it } from 'vitest'
import { GLYPHS_5X7, getGlyph5x7, scaleUp5x7, type Glyph5x7 } from './glyphs5x7'

const EXPECTED_CHARS = [
  // 大写
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  // 小写
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  // 数字
  ...'0123456789'.split(''),
  // 标点
  ...'. , ! ? \' " - + / : ; ( ) [ ]'.split(' ').filter(Boolean),
]

describe('glyphs5x7 字模表', () => {
  it('包含所有 78 个预期字符', () => {
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
  })
})

describe('scaleUp5x7 缩放', () => {
  it('cell=7 输出 7×7 网格', () => {
    const A: Glyph5x7 = [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]
    const grid = scaleUp5x7(A, 7)
    expect(grid.length).toBe(49)
    // 中心一行（y=3）应全亮（0b11111 = 5 列）
    for (let x = 0; x < 5; x++) {
      expect(grid[3 * 7 + x], `(3,${x})`).toBe(1)
    }
    // 顶行（y=0）应只亮 x=1,2,3
    expect(grid[0 * 7 + 0]).toBe(0)
    expect(grid[0 * 7 + 1]).toBe(1)
    expect(grid[0 * 7 + 2]).toBe(1)
    expect(grid[0 * 7 + 3]).toBe(1)
    expect(grid[0 * 7 + 4]).toBe(0)
  })

  it('cell=14 输出 14×14 网格（每个原像素 = 2×2 块）', () => {
    const A: Glyph5x7 = [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]
    const grid = scaleUp5x7(A, 14)
    expect(grid.length).toBe(196)
    // 顶行 (y=0,1) 应只亮 x=2,3,4,5（A 顶行 .###. 占 x=1,2,3 → 放大后 x=2..3, 4..5）
    // 实际上 .###. = bit 1,2,3 set；放大 2× 后 x=2..3, 4..5, 6..7 亮
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
    const dot: Glyph5x7 = [0, 0, 0, 0, 0, 0, 0b00100]
    const grid = scaleUp5x7(dot, 21)
    expect(grid.length).toBe(441)
    // '.' 字符：仅最后一行中央亮
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 21; x++) {
        expect(grid[y * 21 + x], `(${x},${y})`).toBe(0)
      }
    }
    for (let y = 18; y < 21; y++) {
      for (let x = 0; x < 9; x++) {
        expect(grid[y * 21 + x], `(${x},${y})`).toBe(0)
      }
      for (let x = 9; x < 12; x++) {
        expect(grid[y * 21 + x], `(${x},${y})`).toBe(1)
      }
      for (let x = 12; x < 21; x++) {
        expect(grid[y * 21 + x], `(${x},${y})`).toBe(0)
      }
    }
  })

  it('cell 非 7 倍数抛错', () => {
    const A: Glyph5x7 = [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]
    expect(() => scaleUp5x7(A, 12)).toThrow(/multiple of 7/)
    expect(() => scaleUp5x7(A, 16)).toThrow(/multiple of 7/)
  })
})
```

- [ ] **Step 2.2: 跑测试验证通过**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm exec vitest run src/components/marketing/pixel/glyphs5x7.test.ts
```

预期：
- 所有 4 个 describe 块通过
- 总共 6 个 it 测试全部 PASS
- 如果 g / j / p / q / y 用了 8 行（descender 字符），需要单独处理（见 Task 4 注释）

- [ ] **Step 2.3: 提交**

```bash
cd "d:/Users/JZJ/Desktop/agent" && git add frontend/src/components/marketing/pixel/glyphs5x7.ts frontend/src/components/marketing/pixel/glyphs5x7.test.ts && git commit -m "feat(pixel): add 5x7 hand-drawn glyph table for English"
```

---

## Task 3: 处理 descender 字符（g / j / p / q / y）

**问题**：g / j / p / q / y 是 5×7 + 1 行下伸的"descender"字符（8 行总高）。如果直接 7 行会切断尾巴。

**Files:**
- Modify: `frontend/src/components/marketing/pixel/glyphs5x7.ts`

- [ ] **Step 3.1: 改用 5×7 标准字模（去掉下伸）**

把 g / j / p / q / y 的 8 行定义**截断为 7 行**（删除最低一行下伸），保持 7 行一致性。视觉权衡：g/p/q/y 看起来像 "9" 的小一号版本（"破折号"在下部而不是"弯钩"），与 8-bit 终端风格一致。

替换 Task 1 中 g / j / p / q / y 的定义为 7 行版本：

```ts
  g: [
    //  .....
    //  .....
    //  .####
    //  #...#
    //  #...#
    //  .####
    //  .###.
    0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b01110,
  ],
  j: [
    //  ...#.
    //  .....
    //  ..##.
    //  ...#.
    //  ...#.
    //  ...#.
    //  .##..
    0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b00010, 0b01100,
  ],
  p: [
    //  .....
    //  .....
    //  ####.
    //  #...#
    //  #...#
    //  ####.
    //  #....
    0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000,
  ],
  q: [
    //  .....
    //  .....
    //  .####
    //  #...#
    //  #...#
    //  .####
    //  ....#
    0b00000, 0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001,
  ],
  y: [
    //  .....
    //  .....
    //  #...#
    //  #...#
    //  #...#
    //  .####
    //  .###.
    0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01111, 0b01110,
  ],
```

注：所有 7 行定义严格符合 `Glyph5x7` 类型（7 个 uint8），不再用 `as unknown as Glyph5x7` 转换。

- [ ] **Step 3.2: 删除测试文件中的 8 行特殊字符处理（如有）**

`glyphs5x7.test.ts` 的 `EXPECTED_CHARS` 不需要改（只是查表命中），但如果有针对 descender 字符的专门断言，删除。

- [ ] **Step 3.3: 重跑测试**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm exec vitest run src/components/marketing/pixel/glyphs5x7.test.ts
```

预期：全部通过。

- [ ] **Step 3.4: 提交**

```bash
cd "d:/Users/JZJ/Desktop/agent" && git add frontend/src/components/marketing/pixel/glyphs5x7.ts && git commit -m "refactor(pixel): trim descender chars to 7-row height"
```

---

## Task 4: PixelText 接入查表分支 + 改 SIZE_PRESET

**Files:**
- Modify: `frontend/src/components/marketing/pixel/PixelText.tsx`

- [ ] **Step 4.1: 改 SIZE_PRESET 为 7 倍数**

在文件顶部 `SIZE_PRESET` 定义（约第 33-39 行）改为：

```ts
/** cell = 采样网格分辨率（也是 dot=1 时的字形像素高度）。
 *  5×7 字模要求 cell 是 7 的倍数才能保持方块对齐。 */
const SIZE_PRESET: Record<PixelTextSize, { cell: number }> = {
  xs: { cell: 7 },
  sm: { cell: 14 },
  md: { cell: 21 },
  lg: { cell: 28 },
  xl: { cell: 35 },
}
```

- [ ] **Step 4.2: 改 sampleGlyph 加查表分支**

在 `sampleGlyph` 函数顶部（第 115 行附近）加查表分支：

```ts
function sampleGlyph(
  ch: string,
  cell: number,
  weight: number,
  fontFamily: string,
  threshold: number,
  noiseSeed: number,
): Uint8Array {
  // 5×7 字模查表路径：命中 + cell 是 7 倍数 → 用查表位图（已手画，干净不叠加噪点）
  if (noiseSeed === 0) {
    const glyph = getGlyph5x7(ch)
    if (glyph && cell % 7 === 0) {
      return scaleUp5x7(glyph, cell)
    }
  }

  const key = `${ch}|${cell}|${weight}|${fontFamily}|${threshold}|${noiseSeed}`
  const cached = glyphCache.get(key)
  if (cached) return cached

  // 原 canvas 采样逻辑（中文 / 未收录字符 / 噪点模式 / 非 7 倍数 cell）—— 保留不变
  const grid = new Uint8Array(cell * cell)
  const ctx = getSampler()
  if (ctx) {
    samplerCanvas!.width = cell
    samplerCanvas!.height = cell
    ctx.clearRect(0, 0, cell, cell)
    ctx.fillStyle = '#ffffff'
    ctx.font = `${weight} ${Math.round(cell * 0.92)}px ${fontFamily}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(ch, cell / 2, cell / 2 + cell * 0.02)
    const { data } = ctx.getImageData(0, 0, cell, cell)
    if (noiseSeed !== 0) {
      // 只有纵向噪点：每一行用同一个 alpha 抖动，整行同步翻转 → 横向 glitch 条纹。
      // 比逐像素抖动更「大条」、更粗犷，符合「大胆艺术化」诉求。
      const rng = makeRng(noiseSeed ^ hashStr(ch) ^ 0x9e3779b9)
      const rowOffsets = new Int8Array(cell)
      for (let y = 0; y < cell; y++) {
        // 偏移范围 [-NOISE_AMP, +NOISE_AMP]；用 round 落到整数值，避免抖动偏置
        rowOffsets[y] = Math.round((rng() - 0.5) * 2 * NOISE_AMP)
      }
      for (let y = 0; y < cell; y++) {
        const off = rowOffsets[y]
        for (let x = 0; x < cell; x++) {
          const i = y * cell + x
          const alpha = data[i * 4 + 3] + off
          grid[i] = alpha > threshold ? 1 : 0
        }
      }
    } else {
      for (let i = 0; i < cell * cell; i++) {
        grid[i] = data[i * 4 + 3] > threshold ? 1 : 0
      }
    }
  }
  glyphCache.set(key, grid)
  return grid
}
```

注意：
- **只允许 `noiseSeed === 0` 走查表**：噪点模式强制走 canvas 采样（避免破坏"大胆艺术化"噪点效果）
- 查表路径不进 `glyphCache`：5×7 路径是 O(1) 重建（scaleUp5x7 每次几微秒），缓存收益微乎其微
- 加 `import { getGlyph5x7, scaleUp5x7 } from './glyphs5x7'` 到文件顶部

- [ ] **Step 4.3: 跑 TypeScript 校验**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm exec tsc --noEmit 2>&1 | grep -E "(PixelText|glyphs5x7)" | head -20
```

预期：无输出（与这两个文件相关的错）。

- [ ] **Step 4.4: 提交**

```bash
cd "d:/Users/JZJ/Desktop/agent" && git add frontend/src/components/marketing/pixel/PixelText.tsx && git commit -m "feat(pixel): wire 5x7 glyph lookup into sampleGlyph with fallback"
```

---

## Task 5: PixelField cellRange 强制 7 倍数

**Files:**
- Modify: `frontend/src/components/marketing/pixel/PixelField.tsx`

- [ ] **Step 5.1: 改 cellRange 默认值**

`PixelFieldProps` 中 `cellRange?: [number, number]` 默认值从 `[16, 80]` 改为 `[14, 77]`。同时把注释改为：

```ts
  /** 自适应密度的采样分辨率上下限（整数，必须是 7 的倍数）。
   *  默认 [14, 77] → 最小 14（每原像素 2×2 块）、最大 77（每原像素 11×11 块） */
  cellRange?: [number, number]
```

- [ ] **Step 5.2: 解构默认值改 7 倍数**

```ts
  cellRange = [14, 77],
```

- [ ] **Step 5.3: 改 compute() 强制对齐**

`PixelField.tsx` 的 `useLayoutEffect` 内 `compute` 函数中（约 142-146 行 / 164-167 行），两处 `clamp` 之后都加 `Math.round(c / 7) * 7` 强制 7 倍数：

```ts
      if (fillHeight != null) {
        const ph = parent.clientHeight
        const pw = parent.clientWidth
        if (ph <= 0 || pw <= 0) return
        if (autoDensity && K > 0) {
          // 长轴（拉伸后）对齐 targetDot：effCell = ph*fillHeight / (targetDot)
          const c = Math.round((ph * fillHeight) / targetDot)
          const ccRaw = clamp(c, cellRange[0], cellRange[1])
          // 强制对齐到 7 的倍数（5×7 字模方块对齐要求）
          const cc = Math.max(cellRange[0], Math.min(cellRange[1], Math.round(ccRaw / 7) * 7))
          setEffCell(cc)
          // 源宽 ≈ K*cc，dot = ph*fillHeight / (cc*stretchY)
          setEffDot(Math.max(1, (ph * fillHeight) / (cc * stretchY)))
        } else {
          setEffCell(cell)
          setEffDot(Math.max(1, (ph * fillHeight) / (cell * stretchY)))
        }
        return
      }
      if (dotProp != null) {
        setEffCell(cell)
        setEffDot(dotProp)
        return
      }
      const pw = parent.clientWidth
      if (pw <= 0) return
      if (autoDensity && K > 0) {
        // 长轴对齐 targetDot：显示点长轴 = dot*stretchY ≈ targetDot → dot = targetDot/stretchY
        const desiredDot = targetDot / Math.max(1, stretchY)
        // effCell 使源宽 = K*cc，dot = pw/(K*cc) ≈ desiredDot → cc = pw/(K*desiredDot)
        const c = Math.round(pw / (K * desiredDot))
        const ccRaw = clamp(c, cellRange[0], cellRange[1])
        // 强制对齐到 7 的倍数（5×7 字模方块对齐要求）
        const cc = Math.max(cellRange[0], Math.min(cellRange[1], Math.round(ccRaw / 7) * 7))
        setEffCell(cc)
        setEffDot(Math.max(1, pw / (K * cc)))
      } else {
        setEffCell(cell)
        setEffDot(Math.max(1, Math.min(8, pw / refSampled.w)))
      }
```

- [ ] **Step 5.4: 跑 TypeScript 校验**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm exec tsc --noEmit 2>&1 | grep -E "PixelField" | head -20
```

预期：无输出。

- [ ] **Step 5.5: 提交**

```bash
cd "d:/Users/JZJ/Desktop/agent" && git add frontend/src/components/marketing/pixel/PixelField.tsx && git commit -m "feat(pixel): force effCell to multiple of 7 for 5x7 alignment"
```

---

## Task 6: 视觉验证全站

**Files:** 不改文件，验证用

- [ ] **Step 6.1: 启动 dev server**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm dev -- --host
```

预期：Vite dev server 启动，`http://localhost:3000` 可访问。

- [ ] **Step 6.2: 验证营销页 hero 大标题**

浏览器打开 `http://localhost:3000`，截图 hero section 的大像素字。预期：
- 英文清晰、可识别、笔画是整齐方块
- 中文字符（如果有）走 canvas 采样回退，不破图
- "Novel Agent" 字间距合理

- [ ] **Step 6.3: 验证 navbar wordmark**

查看 `http://localhost:3000` 顶部导航，NovelAiPixelWordmark 渲染清晰。预期：
- "Novel Agent" 是整齐的 5×7 像素方块
- "Novel" currentColor + "Agent" 朋克红双色保留
- 末尾 cursor 方块闪烁正常

- [ ] **Step 6.4: 验证 footer 像素场**

滚动到底部，footer 像素场 "NOVEL AGENT" 渲染。预期：
- 大字清晰、方块对齐
- 鼠标吸引 / 撕裂 CRT 效果正常工作
- "NOVEL" 和 "AGENT" 词间距 ≈ 1 字符宽

- [ ] **Step 6.5: 验证仪表盘 / 后台侧栏**

访问 `http://localhost:3000/dashboard` 与 `http://localhost:3000/admin`（如有）。预期：
- 侧栏 wordmark 渲染清晰
- 不破图

- [ ] **Step 6.6: 验证中文 / emoji 走回退**

找一个有中文的 PixelText 调用（首页的 `home.danmaku` `[ VOICES ]` 之类不一定有中文，但 hero 大标题一定有）。如果有中文：中文清晰、识别度高（走 canvas 采样），不破图。

- [ ] **Step 6.7: 跑完整测试套件**

```bash
cd "d:/Users/JZJ/Desktop/agent/frontend" && pnpm test 2>&1 | tail -30
```

预期：所有现有测试 + glyphs5x7 测试全部通过。

- [ ] **Step 6.8: 提交验证结果（如有 UI 调整）**

如果发现视觉问题需要调整（例如某 size 太密或太疏），调整后单独提交：

```bash
cd "d:/Users/JZJ/Desktop/agent" && git add frontend/src/components/marketing/pixel/ && git commit -m "fix(pixel): tune SIZE_PRESET / cellRange based on visual review"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 78 字符（26+26+10+16）— Task 1
- ✅ 5×7 数据结构 + getGlyph5x7 — Task 1
- ✅ sampleGlyph 查表分支 + 噪点跳过 + 回退 — Task 4
- ✅ cell 7 倍数强制（SIZE_PRESET + cellRange） — Task 4, 5
- ✅ canvas 采样回退（中文 / emoji / 非 7 倍数 / 噪点模式）— Task 4
- ✅ 单元测试（查表命中 / 缩放 / 越界）— Task 2
- ✅ 全站 16 调用方零 API 改动 — Task 4 (不变 API)
- ✅ 视觉验证 — Task 6

**2. Placeholder scan:** 无 "TBD" / "implement later" / "fill in details"

**3. Type consistency:**
- `Glyph5x7` 类型在 Task 1 定义，Task 2 复用，Task 4 不接触
- `getGlyph5x7` / `scaleUp5x7` 签名 Task 1 定义，Task 4 复用
- `cellRange` 默认值从 `[16, 80]` 改为 `[14, 77]`，Task 5 同步
- `SIZE_PRESET` cell 值 Task 4 改，Task 6 验证

**4. Risk reduction:**
- g/j/p/q/y descender 字符 8 行 → 7 行截断（Task 3）避免类型不一致
- 噪点模式强制走 canvas 采样（Task 4 if 条件）避免破坏现有"大胆艺术化"效果
- `Math.round(c / 7) * 7` + clamp 防止超出 cellRange（Task 5）
