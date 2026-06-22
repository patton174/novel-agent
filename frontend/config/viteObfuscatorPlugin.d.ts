import type { ObfuscatorOptions } from 'javascript-obfuscator';
import type { Plugin, RenderedChunk } from 'vite';
export type ObfuscatorTier = 'heavy' | 'light' | 'skip';
export declare function resolveObfuscatorTier(chunk: RenderedChunk, code: string): ObfuscatorTier;
export interface TieredObfuscatorOptions {
    heavy: ObfuscatorOptions;
    light: ObfuscatorOptions;
}
export declare function viteObfuscatorPlugin(options: TieredObfuscatorOptions): Plugin;
