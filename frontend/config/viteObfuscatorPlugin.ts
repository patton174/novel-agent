import JavaScriptObfuscator from 'javascript-obfuscator'
import type { ObfuscatorOptions } from 'javascript-obfuscator'
import type { Plugin, RenderedChunk } from 'vite'

/** shadcn / Radix UI 等共享组件 chunk 名前缀（混淆会破坏 React ref / 事件合成） */
const UI_CHUNK_PREFIX =
  /^(dialog|badge|button|avatar|separator|select|dropdown-menu|sheet|switch|popover|tooltip|tabs|checkbox|label|input|card|skeleton)-/

/** 含大量点击/动效的页面 chunk 不混淆（controlFlowFlattening 会破坏 React 事件与 hover） */
const INTERACTIVE_PAGE_CHUNK =
  /^(HomePage|HomeFooterSection|PricingPage|AboutPage|GuidePage|LoginPage|RegisterPage|ForgotPasswordPage|ResetPasswordPage|VerifyEmailPage|GenericContentPage)-/

/** framer-motion / radix / lucide 等 vendor chunk 不可混淆（会破坏事件合成与 ref 回调） */
const VENDOR_CHUNK_SKIP =
  /^(motion|gsap|recharts|markdown|radix|icons|styled|i18n)-/

/**
 * Vite 路由懒加载依赖 __vite__mapDeps / import() 字符串路径；
 * 对含这些特征的 chunk 跳过 obfuscator，避免 chunk 404 + MIME text/html。
 */
function shouldSkipChunkObfuscation(code: string, chunk: RenderedChunk): boolean {
  if (chunk.isEntry) {
    return true
  }
  const baseName = chunk.fileName.split('/').pop() ?? chunk.fileName
  if (INTERACTIVE_PAGE_CHUNK.test(baseName)) {
    return true
  }
  if (VENDOR_CHUNK_SKIP.test(baseName)) {
    return true
  }
  if (code.includes('__vite__mapDeps')) {
    return true
  }
  // 仍含动态 import("assets/…") 的 chunk 不混淆（stringArray 会破坏 URL）
  if (/import\s*\(\s*['"]/.test(code)) {
    return true
  }
  if (UI_CHUNK_PREFIX.test(baseName)) {
    return true
  }
  // Radix / shadcn 组件库 chunk（含 DialogPrimitive 等）不可混淆
  if (
    /data-slot="dialog|DialogPrimitive|@radix-ui|radix-ui|React\.createElement/.test(code) &&
    /data-slot=/.test(code)
  ) {
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
      console.log(`[obfuscator] obfuscated=${obfuscated} skipped=${skipped}`)
    },
  }
}
