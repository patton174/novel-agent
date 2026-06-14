import type { ObfuscatorOptions } from 'javascript-obfuscator';
/** 生产构建默认开启；本地调试可 VITE_CODE_OBFUSCATION=false 关闭 */
export declare function isCodeObfuscationEnabled(mode: string, env: Record<string, string>): boolean;
/** Terser 压缩 + javascript-obfuscator 工业级混淆参数 */
export declare function javascriptObfuscatorOptions(): ObfuscatorOptions;
export declare function terserMinifyOptions(): {
    compress: {
        passes: number;
        pure_funcs: string[];
    };
    mangle: {
        toplevel: boolean;
        safari10: boolean;
    };
    format: {
        comments: boolean;
        ascii_only: boolean;
    };
};
