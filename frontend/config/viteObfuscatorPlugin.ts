import JavaScriptObfuscator from 'javascript-obfuscator'
import type { ObfuscatorOptions } from 'javascript-obfuscator'
import type { Plugin, RenderedChunk } from 'vite'

/**
 * Vite 路由懒加载依赖 __vite__mapDeps / import() 字符串路径；
 * 对含这些特征的 chunk 跳过 obfuscator，避免 chunk 404 + MIME text/html。
 */
function shouldSkipChunkObfuscation(code: string, chunk: RenderedChunk): boolean {
  if (chunk.isEntry) {
    return true
  }
  if (code.includes('__vite__mapDeps')) {
    return true
  }
  // 仍含动态 import("assets/…") 的 chunk 不混淆（stringArray 会破坏 URL）
  if (/import\s*\(\s*['"]/.test(code)) {
    return true
  }
  return false
}

/** 在 Rollup renderChunk 阶段对产物做 javascript-obfuscator 混淆 */
export function viteObfuscatorPlugin(options: ObfuscatorOptions): Plugin {
  let skipped = 0
  let obfuscated = 0

  return {
    name: 'vite-javascript-obfuscator',
    apply: 'build',
    enforce: 'post',
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) {
        return null
      }
      if (shouldSkipChunkObfuscation(code, chunk)) {
        skipped += 1
        return null
      }
      const result = JavaScriptObfuscator.obfuscate(code, options)
      obfuscated += 1
      return {
        code: result.getObfuscatedCode(),
        map: null,
      }
    },
    closeBundle() {
      // eslint-disable-next-line no-console
      console.log(`[obfuscator] obfuscated=${obfuscated} skipped=${skipped}`)
    },
  }
}
