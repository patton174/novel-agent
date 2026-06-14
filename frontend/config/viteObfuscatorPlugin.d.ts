import type { ObfuscatorOptions } from 'javascript-obfuscator';
import type { Plugin } from 'vite';
/** 在 Rollup renderChunk 阶段对产物做 javascript-obfuscator 混淆 */
export declare function viteObfuscatorPlugin(options: ObfuscatorOptions): Plugin;
