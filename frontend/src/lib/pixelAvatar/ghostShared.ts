/** 所有 140×140 画布类头像的统一基准尺寸 */
export const PIXEL_AVATAR_BASE_PX = 140

/** Ghost 14×14 网格模板 — 同宽变体共享 */
export const GHOST_GRID_TEMPLATE_AREAS = `
  "a1  a2  a3  a4  a5  t0  t0  t0  t0  a10 a11 a12 a13 a14"
  "b1  b2  b3  t1  t1  t1  t1  t1  t1  t1  t1  b12 b13 b14"
  "c1 c2 t2 t2 t2 t2 t2 t2 t2 t2 t2 t2 c13 c14"
  "d1 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 d14"
  "e1 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 e14"
  "f1 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 t3 f14"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4 t4"
  "s0 s0 an4 s1 an7 s2 an10 an10 s3 an13 s4 an16 s5 s5"
  "an1 an2 an3 an5 an6 an8 an9 an9 an11 an12 an14 an15 an17 an18"
`.trim()

/** 脚趾闪烁分组：a=phase0, b=phase1 */
export const GHOST_TOE_FLICKER_A = new Set([1, 5, 6, 7, 8, 11, 12, 13, 18])
export const GHOST_TOE_FLICKER_B = new Set([2, 3, 4, 9, 10, 14, 15, 16, 17])

export const GHOST_TOP_AREAS = ['t0', 't1', 't2', 't3', 't4'] as const
export const GHOST_FOOT_AREAS = ['s0', 's1', 's2', 's3', 's4', 's5'] as const
export const GHOST_TOE_AREAS = Array.from({ length: 18 }, (_, i) => `an${i + 1}`)
