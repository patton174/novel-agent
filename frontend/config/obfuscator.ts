import type { ObfuscatorOptions } from 'javascript-obfuscator'

/** manualChunks 中安全模块 bundle 的内部名（不出现在产物文件名） */
export const SECURITY_CHUNK_NAME = '__sec__'

/** 生产构建默认开启；本地调试可 VITE_CODE_OBFUSCATION=false 关闭 */
export function isCodeObfuscationEnabled(mode: string, env: Record<string, string>): boolean {
  const flag = env.VITE_CODE_OBFUSCATION ?? process.env.VITE_CODE_OBFUSCATION
  if (flag === 'false' || flag === '0') return false
  if (flag === 'true' || flag === '1') return true
  return mode === 'production'
}

/** 安全 / 加密链路：强混淆 */
export function javascriptObfuscatorHeavyOptions(): ObfuscatorOptions {
  return {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.9,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    identifiersPrefix: '_0x',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    renameProperties: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.75,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.85,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  }
}

/** 业务 UI / 样式相关 chunk：轻混淆（不破坏 React 事件与懒加载路径） */
export function javascriptObfuscatorLightOptions(): ObfuscatorOptions {
  return {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    identifiersPrefix: '_0x',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    renameProperties: false,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: [],
    stringArrayThreshold: 0.45,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  }
}

/** @deprecated 使用 javascriptObfuscatorHeavyOptions */
export function javascriptObfuscatorOptions(): ObfuscatorOptions {
  return javascriptObfuscatorHeavyOptions()
}

export function terserMinifyOptions() {
  return {
    compress: {
      passes: 2,
      pure_funcs: ['console.debug'],
    },
    mangle: {
      toplevel: true,
      safari10: true,
    },
    format: {
      comments: false,
      ascii_only: false,
    },
  }
}
