# 像素字英文 5×7 手画点阵化

日期: 2026-06-21
范围: 营销区 / 仪表盘 / 后台所有 `PixelText` + `PixelField` + `NovelAiPixelWordmark` 渲染的英文文本

## 背景与动机

`PixelText` / `PixelField` 当前用 canvas 2D 把 `Geist` 系统字体画到 `cell × cell`（9~30px）的小画布上，再用 alpha 阈值采样成 1px 方块点阵输出到 PNG。

**问题**：这是在做「**抗锯齿字体的微缩光栅化**」，不是真正的点阵字。视觉上：
- 小 cell（9~16）下：笔画相互渗透、字形破碎、识别度差
- 大 cell（22~30）下：笔画细成线，缺乏"像素方块感"
- 同一字符串在不同 cell 下长相差异巨大、不稳定
- 字母基线 / 字宽 / 字偶距不规整 → 不像"字"像"马赛克"

在「Pixel-Punk Neo-Brutalism」主题下，这种"光栅化抗锯齿字"既不像素也不朋克。

## 目标

**手画 5×7 英文点阵字模表**，让英文（26 大写 + 26 小写 + 0-9 + 关键标点 ≈ 70 字符）以**真·点阵字**的方式渲染。中文 / emoji / 未收录字符继续走 canvas 采样回退。

### 不做

- 不引入第三方点阵字体（Press Start 2P / VT323 等）—— 走自画，零外部依赖
- 不重写组件 API —— 16 个调用方零改动
- 不改 `dot` / `glyphGap` / `wordGap` / `fill` 等所有现有参数语义

## 设计

### 1. 字符集

5×7 点阵（5 列笔画 + 7 行高度 + 1 列字间空白 = 6 px 字符宽；7 行总高）：

| 类别 | 字符数 | 字符 |
|------|--------|------|
| 大写字母 | 26 | A-Z |
| 小写字母 | 26 | a-z |
| 数字 | 10 | 0-9 |
| 常用标点 | 8 | `. , ! ? ' " -` |
| 括号 | 4 | `( ) [ ]` |
| 特殊 | 4 | `+ / : ;` |
| **合计** | **~78** | |

未列出的字符（含中文 / emoji / 拉丁变音 / 标点变体）走 canvas 采样回退。

### 2. 数据结构

新增 `frontend/src/components/marketing/pixel/glyphs5x7.ts`：

```ts
/** 5×7 字符位图：每行一个 uint8，bit 0..4 代表该列是否点亮（1=亮） */
export type Glyph5x7 = readonly [number, number, number, number, number, number, number]

/** 5×7 字模表：key 为单字符。查不到的字符走 canvas 采样回退 */
export const GLYPHS_5X7: Readonly<Record<string, Glyph5x7>> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  // ... 共约 78 字符
}

/** 查询接口：命中返回 Glyph5x7，未命中返回 null（调用方走回退） */
export function getGlyph5x7(ch: string): Glyph5x7 | null {
  return GLYPHS_5X7[ch] ?? null
}
```

每个字符在源码里写成 7 行 ASCII 注释（行末带可视位图）方便人工审查：

```ts
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
```

### 3. 与现有 `sampleGlyph` 集成

改写 `PixelText.tsx` 中的 `sampleGlyph`：

```ts
function sampleGlyph(ch, cell, weight, fontFamily, threshold, noiseSeed) {
  // 5×7 路径：查表命中 → 把位图按 cell/7 比例放大，返回 cell×cell 网格
  const glyph = getGlyph5x7(ch)
  if (glyph && cell % 7 === 0) {
    return scaleUp5x7(glyph, cell, noiseSeed)
  }
  // 回退：现有 canvas 采样逻辑（中文 / 未收录字符）
  return sampleGlyphFromCanvas(ch, cell, weight, fontFamily, threshold, noiseSeed)
}
```

`scaleUp5x7` 把 5×7 位图放大到 cell×cell 网格：
- 原图 1 像素 = 输出 (cell/7) × (cell/7) 屏像素块
- `cell` 必须是 7 的倍数（14、21、28、35...）才能点对齐
- 噪点：原 5×7 是干净位图（已手画），**不再叠加现有 `NOISE_AMP` 行抖动**（手画字符本身就是设计，不应被噪点破坏）

### 4. cell 必须 7 倍数

5×7 字模要求 `cell` 是 7 的倍数才能保持方块对齐。改动：

- `SIZE_PRESET`：从 `{9, 12, 16, 22, 30}` 改成 `{7, 14, 21, 28, 35}`（**5 个 size 对应 7 倍数**）
- `PixelField.cellRange`：从 `[16, 80]` 改成 `[14, 77]`，且在 `compute()` 中 `Math.round(c / 7) * 7` 强制对齐
- 未命中 7 倍数时回退到 canvas 采样路径（与未收录字符策略一致）

### 5. 字符宽度差异

5×7 字模是**真实变宽字**：`i` / `l` 是 1~2 列窄字，`m` / `w` 是 5 列宽字、`A` 是 5 列宽字。这**不是 bug 是 feature** —— 像早期终端字，每个字有自然字宽。

`glyphGap` 当前 1 源像素 = 1 屏像素（已用 `dot=1` 测过）。新方案下 `glyphGap=1` 仍是 1 源像素，在 cell=14 下是 2 屏像素、cell=28 下是 4 屏像素，比例合理。

### 6. 大小写区分

- 0 vs O：`O` 是完整椭圆（5 列宽），`0` 中心带斜杠或点 → 区分明确
- 1 vs I vs l：`1` 顶部有斜肩、`I` 顶部有横衬、`l` 顶部无横衬 → 区分明确
- 5 vs S：保留各自典型形态
- B/8、D/0：保留各自形态

### 7. 回退策略

5×7 字模**未收录** + `cell` **非 7 倍数** → 走 canvas 采样。

回退触发条件（任一）：
- `getGlyph5x7(ch) === null`
- `cell % 7 !== 0`

回退路径完全保留现有逻辑（噪点、threshold、fontWeight 等），不破坏中文支持。

### 8. 调用方

16 个调用方**零改动**。`PixelText` / `PixelField` / `NovelAiPixelWordmark` 的 props 全部不变；`SIZE_PRESET` 和 `cellRange` 默认值更新即可。

## 实施步骤

1. **新增 `pixel/glyphs5x7.ts`**：手画 78 字符的 5×7 位图（含 ASCII 注释行）
2. **改 `pixel/PixelText.tsx`**：
   - `SIZE_PRESET` 改为 7 倍数（`xs:7, sm:14, md:21, lg:28, xl:35`）
   - `sampleGlyph` 加 5×7 查表分支，未命中走 canvas 回退
   - `cell % 7 !== 0` 时直接走 canvas 回退
3. **改 `pixel/PixelField.tsx`**：
   - `cellRange` 改为 `[14, 77]`
   - `compute()` 中 `Math.round(c / 7) * 7` 强制对齐
4. **验证**：跑 `pnpm exec tsc --noEmit` 通过；HMR 刷新营销页 / 仪表盘 / 后台肉眼对比

## 风险与权衡

| 风险 | 应对 |
|------|------|
| 5×7 字符数有限，特殊字符走回退视觉割裂 | 收录足够多常用字符 + 字号小时回退效果可接受 |
| `cell` 必须 7 倍数破坏现有调参 | 仅影响 PixelField autoDensity 路径；手动指定 cell 不受影响 |
| 手画 78 字符工作量大、易错 | 单元测试 `getGlyph5x7` 全部命中 + 视觉测试 |
| 5×7 大写 / 小写笔画粗细一样，"a" 看起来像"A" 的小一号 | 接受这个 8-bit 经典风格；如需区分可单独设计 |

## 验证

- `pnpm exec tsc --noEmit` 通过
- 营销页 hero 大标题、footer 像素场、navbar wordmark 三个主要位置肉眼对比
- 仪表盘 / 后台侧栏的 wordmark 不破图
- 中文 / emoji 仍然走 canvas 采样回退，渲染正常
- 噪点效果仅作用于回退路径（手画字符清晰）

## 范围外

- 不引入第三方点阵字体
- 不改组件 API
- 不支持自定义字模注入（如果未来需要可加 `customGlyphs` prop）
- 不支持 5×7 之外的字模尺寸（8×8、6×10 等）
