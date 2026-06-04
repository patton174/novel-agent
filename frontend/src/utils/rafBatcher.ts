/** 合并同一帧内多次高频更新（如 message.delta），尾帧 flush 保证一致性 */
export function createRafBatcher(fn: () => void) {
  let id: number | null = null

  const run = () => {
    id = null
    fn()
  }

  return {
    schedule() {
      if (id !== null) {
        return
      }
      id = requestAnimationFrame(run)
    },
    flushNow() {
      if (id !== null) {
        cancelAnimationFrame(id)
        id = null
      }
      fn()
    },
  }
}
