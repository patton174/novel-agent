import JavaScriptObfuscator from 'javascript-obfuscator'
import type { ObfuscatorOptions } from 'javascript-obfuscator'
import type { Plugin, RenderedChunk } from 'vite'
import { SECURITY_CHUNK_NAME } from './obfuscator'

export type ObfuscatorTier = 'heavy' | 'light' | 'skip'

/** shadcn / Radix UI 等共享组件 chunk（强混淆会破坏 React ref / 事件合成） */
const UI_CHUNK_PREFIX =
  /^(dialog|badge|button|avatar|separator|select|dropdown-menu|sheet|switch|popover|tooltip|tabs|checkbox|label|input|card|skeleton)(-.+)?$/

/** 含大量点击/动效的页面 chunk 不混淆（controlFlowFlattening 会破坏 React 事件与 hover） */
const INTERACTIVE_PAGE_CHUNK =
  /^(HomePage|HomeFooterSection|PricingPage|AboutPage|GuidePage|LoginPage|RegisterPage|ForgotPasswordPage|ResetPasswordPage|VerifyEmailPage|GenericContentPage)$/

/** framer-motion / radix / lucide 等 vendor chunk 不可混淆 */
const VENDOR_CHUNK_NAMES =
  /^(motion|gsap|recharts|markdown|radix|icons|styled|i18n|vendor|node_modules)$/

/**
 * Vite 路由懒加载依赖 __vite__mapDeps / import() 字符串路径；
 * 对含这些特征的 chunk 跳过 obfuscator，避免 chunk 404 + MIME text/html。
 */
export function resolveObfuscatorTier(chunk: RenderedChunk, code: string): ObfuscatorTier {
  if (chunk.name === SECURITY_CHUNK_NAME) {
    return 'heavy'
  }
  if (chunk.isEntry) {
    return 'skip'
  }
  const chunkName = chunk.name ?? ''
  if (INTERACTIVE_PAGE_CHUNK.test(chunkName)) {
    return 'skip'
  }
  if (VENDOR_CHUNK_NAMES.test(chunkName)) {
    return 'skip'
  }
  if (UI_CHUNK_PREFIX.test(chunkName)) {
    return 'skip'
  }
  if (code.includes('__vite__mapDeps')) {
    return 'skip'
  }
  if (/import\s*\(\s*['"]/.test(code)) {
    return 'skip'
  }
  if (
    /data-slot="dialog|DialogPrimitive|@radix-ui|radix-ui|React\.createElement/.test(code) &&
    /data-slot=/.test(code)
  ) {
    return 'skip'
  }
  return 'light'
}

export interface TieredObfuscatorOptions {
  heavy: ObfuscatorOptions
  light: ObfuscatorOptions
}

/** 在 Rollup renderChunk 阶段按 chunk 分级做 javascript-obfuscator 混淆 */
export function viteObfuscatorPlugin(options: TieredObfuscatorOptions): Plugin {
  const stats = { heavy: 0, light: 0, skipped: 0 }

  return {
    name: 'vite-javascript-obfuscator',
    apply: 'build',
    enforce: 'post',
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) {
        return null
      }
      const tier = resolveObfuscatorTier(chunk, code)
      if (tier === 'skip') {
        stats.skipped += 1
        return null
      }
      const obfuscatorOptions = tier === 'heavy' ? options.heavy : options.light
      const result = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions)
      stats[tier] += 1
      return {
        code: result.getObfuscatedCode(),
        map: null,
      }
    },
    closeBundle() {
      console.log(
        `[obfuscator] heavy=${stats.heavy} light=${stats.light} skipped=${stats.skipped}`,
      )
    },
  }
}
