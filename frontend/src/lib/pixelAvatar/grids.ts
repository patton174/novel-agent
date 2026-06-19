/** 7×7 网格：row 1-7，col 1-7 → 1-indexed cell id */
function cells(row: number, cols: number[]): number[] {
  return cols.map((col) => (row - 1) * 7 + col)
}

function cellSet(rows: Array<[number, number[]]>): Set<number> {
  return new Set(rows.flatMap(([row, cols]) => cells(row, cols)))
}

/** 经典像素五角星 */
export const STAR_CELLS = cellSet([
  [1, [4]],
  [2, [3, 4, 5]],
  [3, [2, 3, 4, 5, 6]],
  [4, [1, 2, 3, 4, 5, 6, 7]],
  [5, [3, 4, 5]],
  [6, [4]],
])

export const STAR_SPARKLE = new Set([...cells(1, [4]), ...cells(3, [2, 6]), ...cells(4, [1, 7]), ...cells(6, [4])])

/** 对称像素爱心 */
export const HEART_CELLS = cellSet([
  [1, [2, 3, 5, 6]],
  [2, [1, 2, 3, 4, 5, 6, 7]],
  [3, [1, 2, 3, 4, 5, 6, 7]],
  [4, [2, 3, 4, 5, 6]],
  [5, [3, 4, 5]],
  [6, [4]],
])

/** 圆顶史莱姆 */
export const SLIME_CELLS = cellSet([
  [1, [3, 4, 5]],
  [2, [2, 3, 4, 5, 6]],
  [3, [1, 2, 3, 4, 5, 6, 7]],
  [4, [1, 2, 3, 4, 5, 6, 7]],
  [5, [2, 3, 4, 5, 6]],
  [6, [3, 4, 5]],
])

export const SLIME_EYES = new Set(cells(4, [2, 6]))

/** 方块机器人头（天线单独绘制） */
export const BOT_CELLS = cellSet([
  [2, [2, 3, 4, 5, 6]],
  [3, [2, 3, 4, 5, 6]],
  [4, [2, 3, 4, 5, 6]],
  [5, [2, 3, 4, 5, 6]],
  [6, [3, 4, 5]],
])

export const BOT_EYES = new Set(cells(3, [3, 5]))
export const BOT_MOUTH = new Set(cells(5, [3, 4, 5]))
export const BOT_BOLT = new Set(cells(2, [4]))

/** 小猫脸 */
export const KITTY_CELLS = cellSet([
  [1, [2, 6]],
  [2, [1, 2, 3, 5, 6, 7]],
  [3, [1, 2, 3, 4, 5, 6, 7]],
  [4, [1, 2, 3, 4, 5, 6, 7]],
  [5, [2, 3, 4, 5, 6]],
  [6, [3, 4, 5]],
])

export const KITTY_EARS = new Set([...cells(1, [2, 6]), ...cells(2, [1, 3, 5, 7])])
export const KITTY_EYES = new Set(cells(4, [2, 6]))
export const KITTY_NOSE = new Set(cells(5, [4]))
export const KITTY_WHISKER = new Set([...cells(5, [1, 7]), ...cells(6, [2, 6])])
